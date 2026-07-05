package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/brocaar/chirpstack-simulator/internal/simulator"
	sim_pkg "github.com/brocaar/chirpstack-simulator/simulator"
	"github.com/brocaar/lorawan"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	log "github.com/sirupsen/logrus"
)

func getCounterValue(c prometheus.Counter) float64 {
	var m dto.Metric
	if err := c.Write(&m); err != nil {
		return 0
	}
	return m.GetCounter().GetValue()
}

func getCounterVecValue(cv *prometheus.CounterVec, tenantID string) float64 {
	c, err := cv.GetMetricWithLabelValues(tenantID)
	if err != nil {
		return 0
	}
	return getCounterValue(c)
}

func getCounterVecSum(cv *prometheus.CounterVec) float64 {
	reqs, err := GetActiveOrgConfigs()
	if err != nil {
		return 0
	}
	var sum float64
	for _, req := range reqs {
		sum += getCounterVecValue(cv, req.TenantID)
	}
	return sum
}

// handleStatus returns the current simulation state and metrics.
func handleStatus(w http.ResponseWriter, r *http.Request, state *SimState) {
	state.mu.Lock()
	defer state.mu.Unlock()

	resp := map[string]interface{}{
		"status": string(state.Status),
	}

	if state.Status == StatusRunning || state.Status == StatusStopping {
		resp["started_at_ms"] = state.StartedAt
		resp["uptime_seconds"] = (time.Now().UnixMilli() - state.StartedAt) / 1000
	}

	if state.Config != nil {
		resp["config"] = state.Config
	}

	tenantID := r.URL.Query().Get("tenant_id")

	var ducVal, djrcVal, djacVal, gucVal, gdcVal float64

	if tenantID != "" && tenantID != "all" {
		ducVal = getCounterVecValue(sim_pkg.DeviceUplinkCounterVec(), tenantID)
		djrcVal = getCounterVecValue(sim_pkg.DeviceJoinRequestCounterVec(), tenantID)
		djacVal = getCounterVecValue(sim_pkg.DeviceJoinAcceptCounterVec(), tenantID)
		gucVal = getCounterVecValue(sim_pkg.GatewayUplinkCounterVec(), tenantID)
		gdcVal = getCounterVecValue(sim_pkg.GatewayDownlinkCounterVec(), tenantID)
	} else {
		ducVal = getCounterVecSum(sim_pkg.DeviceUplinkCounterVec())
		djrcVal = getCounterVecSum(sim_pkg.DeviceJoinRequestCounterVec())
		djacVal = getCounterVecSum(sim_pkg.DeviceJoinAcceptCounterVec())
		gucVal = getCounterVecSum(sim_pkg.GatewayUplinkCounterVec())
		gdcVal = getCounterVecSum(sim_pkg.GatewayDownlinkCounterVec())
	}

	// Fetch metrics
	resp["metrics"] = map[string]float64{
		"device_uplink_count":       ducVal,
		"device_join_request_count": djrcVal,
		"device_join_accept_count":  djacVal,
		"gateway_uplink_count":      gucVal,
		"gateway_downlink_count":    gdcVal,
	}

	writeJSON(w, http.StatusOK, resp)
}

// syncMissingOrgConfigs ensures all tenants in ChirpStack have a simulation config in SQLite.
func syncMissingOrgConfigs() {
	if !as.IsConnected() {
		log.Warn("syncMissingOrgConfigs: ChirpStack API not connected, skipping sync")
		return
	}

	ctx := context.Background()
	respTenants, err := as.Tenant().List(ctx, &api.ListTenantsRequest{Limit: 100})
	if err != nil {
		log.WithError(err).Error("syncMissingOrgConfigs: failed to list tenants")
		return
	}

	for _, t := range respTenants.GetResult() {
		tenantID := t.GetId()
		cfg, err := GetOrgConfig(tenantID)
		if err != nil {
			log.WithError(err).Warnf("syncMissingOrgConfigs: failed to get config for tenant %s", tenantID)
			continue
		}
		if cfg != nil {
			// Already has config, skip
			continue
		}

		// Config does not exist, let's create a default config
		deviceCount := 5 // default
		appName := t.GetName()
		devicePrefix := "sim-dev"

		respApps, err := as.Application().List(ctx, &api.ListApplicationsRequest{Limit: 100, TenantId: tenantID})
		if err == nil {
			if len(respApps.GetResult()) > 0 {
				// Use the first application name
				appName = respApps.GetResult()[0].GetName()
				
				// Count devices across all applications for this tenant
				totalDevs := 0
				for _, app := range respApps.GetResult() {
					respDevs, err := as.Device().List(ctx, &api.ListDevicesRequest{Limit: 100, ApplicationId: app.GetId()})
					if err == nil {
						totalDevs += len(respDevs.GetResult())
						if len(respDevs.GetResult()) > 0 {
							// If devices exist, we want to match the device name prefix.
							firstName := respDevs.GetResult()[0].GetName()
							// Find the last dash index followed by digits
							lastDash := -1
							for idx, char := range firstName {
								if char == '-' {
									lastDash = idx
								}
							}
							if lastDash != -1 && lastDash < len(firstName)-1 {
								// Check if suffix is a number
								isNum := true
								for _, char := range firstName[lastDash+1:] {
									if char < '0' || char > '9' {
										isNum = false
										break
									}
								}
								if isNum {
									devicePrefix = firstName[:lastDash]
								}
							}
						}
					}
				}
				if totalDevs > 0 {
					deviceCount = totalDevs
				}
			}
		}

		defaultCfg := StartRequest{
			TenantID:             tenantID,
			DeviceCount:          deviceCount,
			GatewayCount:         1,
			Duration:             "0s",
			ActivationTime:       "30s",
			UplinkInterval:       "2m",
			AppName:              appName,
			DevicePrefix:         devicePrefix,
			FPort:                10,
			Payload:              "001903F521", // 5-byte payload triggers dynamic telemetry logging
			Frequency:            868100000,
			Bandwidth:            125000,
			SpreadingFactor:      7,
			EventTopicTemplate:   "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
			CommandTopicTemplate: "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}",
		}
		
		if err := SaveOrgConfig(tenantID, &defaultCfg); err != nil {
			log.WithError(err).Warnf("syncMissingOrgConfigs: failed to save default simulation config for org %s", t.GetName())
		} else {
			log.Infof("syncMissingOrgConfigs: synchronized default simulation config for org %s", t.GetName())
		}
	}
}

// handleStart launches a new simulation.
func handleStart(w http.ResponseWriter, r *http.Request, state *SimState) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req StartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if err := validateStartRequest(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	// Apply defaults.
	if req.DeviceCount == 0 {
		req.DeviceCount = 10
	}
	if req.GatewayCount == 0 {
		req.GatewayCount = 3
	}
	if req.Duration == "" {
		req.Duration = "0s"
	}
	if req.ActivationTime == "" {
		req.ActivationTime = "1m"
	}
	if req.UplinkInterval == "" {
		req.UplinkInterval = "2m"
	}
	if req.AppName == "" {
		req.AppName = "simulasyon"
	}
	if req.DevicePrefix == "" {
		req.DevicePrefix = "sim-dev"
	}
	if req.FPort == 0 {
		req.FPort = 10
	}
	if req.Payload == "" {
		req.Payload = "0102030405"
	}
	if req.Frequency == 0 {
		req.Frequency = 868100000
	}
	if req.Bandwidth == 0 {
		req.Bandwidth = 125000
	}
	if req.SpreadingFactor == 0 {
		req.SpreadingFactor = 7
	}
	if req.EventTopicTemplate == "" {
		req.EventTopicTemplate = "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}"
	}
	if req.CommandTopicTemplate == "" {
		req.CommandTopicTemplate = "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"
	}

	// Sanitize network degradation values
	if req.PacketLoss < 0 {
		req.PacketLoss = 0
	} else if req.PacketLoss > 100 {
		req.PacketLoss = 100
	}
	if req.LatencyMs < 0 {
		req.LatencyMs = 0
	} else if req.LatencyMs > 5000 {
		req.LatencyMs = 5000
	}

	// Sync all missing organization configs from ChirpStack first.
	syncMissingOrgConfigs()

	cfg, err := discoverAndBuildConfig()
	if err != nil {
		log.WithError(err).Error("HTTP API: failed to discover and build simulator configuration")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Simülasyon topolojisi keşfedilemedi: " + err.Error()})
		return
	}

	state.mu.Lock()
	if state.Status != StatusIdle && state.Status != StatusError {
		state.mu.Unlock()
		writeJSON(w, http.StatusConflict, map[string]interface{}{
			"error":  "simulation already running",
			"status": string(state.Status),
		})
		return
	}

	state.Config = &req
	state.Status = StatusStarting
	state.StartedAt = time.Now().UnixMilli()
	sim_pkg.ActiveDevices.Clear()
	sim_pkg.ActiveGateways.Clear()

	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}

	state.Cancel = cancel
	state.Wg = wg
	state.mu.Unlock()

	go func() {
		state.mu.Lock()
		state.Status = StatusRunning
		state.mu.Unlock()

		if err := simulator.Start(ctx, wg, cfg); err != nil {
			log.WithError(err).Error("HTTP API: simulator start error")
			state.mu.Lock()
			state.Status = StatusError
			state.mu.Unlock()
			return
		}

		// Block until all simulation goroutines finish.
		wg.Wait()

		state.mu.Lock()
		state.Status = StatusIdle
		state.Config = nil
		state.mu.Unlock()

		log.Info("HTTP API: simulation completed")
	}()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "starting",
		"message": "Simulation is starting...",
	})
}

// handleStop cancels the running simulation.
func handleStop(w http.ResponseWriter, r *http.Request, state *SimState) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	state.mu.Lock()
	defer state.mu.Unlock()

	if state.Status != StatusRunning && state.Status != StatusStarting {
		writeJSON(w, http.StatusConflict, map[string]interface{}{
			"error":  "simulation already stopped",
			"status": string(state.Status),
		})
		return
	}

	state.Status = StatusStopping
	if state.Cancel != nil {
		state.Cancel()
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "stopping",
		"message": "Simulation is stopping...",
	})
}

// discoverAndBuildConfig automatically discovers all tenants, gateways, applications, and devices, building a config.Config.
func discoverAndBuildConfig() (config.Config, error) {
	cfg := config.C
	cfg.Simulator = nil

	if !as.IsConnected() {
		return cfg, fmt.Errorf("ChirpStack API bağlantısı kurulmadı")
	}

	ctx := context.Background()

	// Load custom intervals for this simulation once outside the loops
	devIntervals, _ := GetDeviceIntervals()

	// 1. List all tenants
	tenantsResp, err := as.Tenant().List(ctx, &api.ListTenantsRequest{Limit: 100})
	if err != nil {
		return cfg, fmt.Errorf("failed to list tenants: %w", err)
	}

	for _, tenantItem := range tenantsResp.GetResult() {
		tenantID := tenantItem.GetId()

		// Get org config from SQLite if it exists
		orgCfg, err := GetOrgConfig(tenantID)
		if err != nil {
			log.WithError(err).Warnf("failed to get sqlite config for tenant %s", tenantID)
		}

		// 2. Fetch gateways for this tenant
		gwsResp, err := as.Gateway().List(ctx, &api.ListGatewaysRequest{
			TenantId: tenantID,
			Limit:    1000,
		})
		if err != nil {
			log.WithError(err).Warnf("failed to list gateways for tenant %s, skipping", tenantID)
			continue
		}
		if len(gwsResp.GetResult()) == 0 {
			log.Infof("tenant %s has no gateways, skipping", tenantItem.GetName())
			continue
		}

		// 3. Fetch applications for this tenant
		appsResp, err := as.Application().List(ctx, &api.ListApplicationsRequest{
			TenantId: tenantID,
			Limit:    1000,
		})
		if err != nil {
			log.WithError(err).Warnf("failed to list applications for tenant %s, skipping", tenantID)
			continue
		}

		for _, appItem := range appsResp.GetResult() {
			appID := appItem.GetId()
			appName := appItem.GetName()

			// 4. Fetch devices for this application
			devsResp, err := as.Device().List(ctx, &api.ListDevicesRequest{
				ApplicationId: appID,
				Limit:         1000,
			})
			if err != nil {
				log.WithError(err).Warnf("failed to list devices for app %s, skipping", appName)
				continue
			}

			activeDevsCount := 0
			for range devsResp.GetResult() {
				activeDevsCount++
			}

			if activeDevsCount == 0 {
				log.Infof("application %s has no devices, skipping", appName)
				continue
			}

			// Apply defaults or loaded sqlite config values
			uplinkInterval := 2 * time.Minute
			fPort := uint8(10)
			payload := "001903F521"
			payloadScript := ""
			frequency := 868100000
			bandwidth := 125000
			spreadingFactor := 7
			packetLoss := 0.0
			simulatePacketLoss := false
			latencyMs := 0
			anomalyProbability := 0.0
			anomalyTypes := ""
			anomalyDuration := 5

			if orgCfg != nil {
				if orgCfg.UplinkInterval != "" {
					if dur, err := time.ParseDuration(orgCfg.UplinkInterval); err == nil {
						uplinkInterval = dur
					}
				}
				if orgCfg.FPort != 0 {
					fPort = uint8(orgCfg.FPort)
				}
				if orgCfg.Payload != "" {
					payload = orgCfg.Payload
				}
				payloadScript = orgCfg.PayloadScript
				if orgCfg.Frequency != 0 {
					frequency = orgCfg.Frequency
				}
				if orgCfg.Bandwidth != 0 {
					bandwidth = orgCfg.Bandwidth
				}
				if orgCfg.SpreadingFactor != 0 {
					spreadingFactor = orgCfg.SpreadingFactor
				}
				packetLoss = orgCfg.PacketLoss
				simulatePacketLoss = orgCfg.SimulatePacketLoss
				latencyMs = orgCfg.LatencyMs
				anomalyProbability = orgCfg.AnomalyProbability
				anomalyTypes = orgCfg.AnomalyTypes
				anomalyDuration = orgCfg.AnomalyDuration
			}

			duration := time.Duration(0)
			activationTime := 30 * time.Second

			simCfg := config.SimulatorConfig{
				TenantID:            tenantID,
				Duration:            duration,
				ActivationTime:      activationTime,
				AppName:             appName,
				DeviceNamePrefix:    "",
				PayloadScript:       payloadScript,
				PacketLoss:          packetLoss,
				SimulatePacketLoss:  simulatePacketLoss,
				LatencyMs:           latencyMs,
				AnomalyProbability:  anomalyProbability,
				AnomalyTypes:        anomalyTypes,
				AnomalyDuration:     anomalyDuration,
				PassiveMode:         true, // IMPORTANT: force passive mode to use existing gateways/devices
			}

			simCfg.Device.Count = activeDevsCount
			simCfg.Device.UplinkInterval = uplinkInterval
			simCfg.Device.FPort = fPort
			simCfg.Device.Payload = payload
			simCfg.Device.Frequency = frequency
			simCfg.Device.Bandwidth = bandwidth
			simCfg.Device.SpreadingFactor = spreadingFactor
			simCfg.Gateway.MinCount = len(gwsResp.GetResult())
			simCfg.Gateway.MaxCount = len(gwsResp.GetResult())
			simCfg.Gateway.EventTopicTemplate = "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}"
			simCfg.Gateway.CommandTopicTemplate = "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"

			// Apply custom intervals if loaded
			if len(devIntervals) > 0 {
				simCfg.DeviceIntervals = make(map[string]time.Duration)
				for devEUI, intStr := range devIntervals {
					dur, err := time.ParseDuration(intStr)
					if err == nil {
						simCfg.DeviceIntervals[devEUI] = dur
					}
				}
			}

			cfg.Simulator = append(cfg.Simulator, simCfg)
		}
	}

	return cfg, nil
}

func validateStartRequest(req *StartRequest) error {
	if req.UplinkInterval != "" {
		d, err := time.ParseDuration(req.UplinkInterval)
		if err != nil {
			return fmt.Errorf("geçersiz uplink sıklığı formatı (örn: 5m, 30s): %w", err)
		}
		if d < time.Second {
			return fmt.Errorf("uplink sıklığı en az 1 saniye olmalıdır")
		}
	}
	if req.Duration != "" && req.Duration != "0s" {
		_, err := time.ParseDuration(req.Duration)
		if err != nil {
			return fmt.Errorf("geçersiz süre formatı (örn: 5m, 1h): %w", err)
		}
	}
	if req.ActivationTime != "" {
		_, err := time.ParseDuration(req.ActivationTime)
		if err != nil {
			return fmt.Errorf("geçersiz aktivasyon süresi formatı (örn: 30s, 1m): %w", err)
		}
	}
	return nil
}

func handleSimulationMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := sim_pkg.GetMetrics()
	writeJSON(w, http.StatusOK, metrics)
}

func handleSimulationDevices(w http.ResponseWriter, r *http.Request) {
	devices := sim_pkg.ActiveDevices.GetStatuses()
	writeJSON(w, http.StatusOK, map[string]interface{}{"devices": devices})
}

func handleSimulationGateways(w http.ResponseWriter, r *http.Request) {
	gateways := sim_pkg.ActiveGateways.GetStatuses()
	writeJSON(w, http.StatusOK, map[string]interface{}{"gateways": gateways})
}

func handleDeviceAnomaly(w http.ResponseWriter, r *http.Request, devEUIStr string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req struct {
		Type   string `json:"type"`   // "spike", "flatline", "dropout", "drift"
		Action string `json:"action"` // "trigger", "start", "stop"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	var devEUI lorawan.EUI64
	if err := devEUI.UnmarshalText([]byte(devEUIStr)); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid dev_eui"})
		return
	}

	// Look up in ActiveDevices
	d := sim_pkg.ActiveDevices.GetDevice(devEUI)
	if d == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "device not actively simulated"})
		return
	}

	d.Lock()
	defer d.Unlock()

	if req.Action == "stop" {
		d.SetManualAnomaly("", false)
	} else if req.Action == "start" || req.Action == "trigger" {
		d.SetManualAnomaly(req.Type, true)
	} else {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid action"})
		return
	}

	log.WithFields(log.Fields{
		"dev_eui": devEUIStr,
		"type":    req.Type,
		"action":  req.Action,
	}).Info("anomaly: manual command applied")

	writeJSON(w, http.StatusOK, map[string]string{"status": "applied"})
}

func handleSMTPConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"enabled":      config.C.SMTP.Enabled,
		"host":         config.C.SMTP.Host,
		"port":         config.C.SMTP.Port,
		"report_email": config.C.SMTP.ReportEmail,
		"from_email":   config.C.SMTP.FromEmail,
	})
}

func handleTestEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	err := SendEmailReport(true)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "delivered"})
}
