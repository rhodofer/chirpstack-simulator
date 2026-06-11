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
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	log "github.com/sirupsen/logrus"
)

// Server holds the HTTP API server.
type Server struct {
	Handler   http.Handler // exported for testing via httptest
	httpServer *http.Server
}

// New creates a new HTTP API server instance.
func New(bind string) *Server {
	InitLogHook()
	if err := SetupDB(); err != nil {
		log.WithError(err).Fatal("api: failed to initialize sqlite database")
	}
	mux := http.NewServeMux()
	state := GetState()

	// Auth endpoints
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/auth/logout", handleLogout)
	mux.HandleFunc("/api/auth/status", handleAuthStatus)

	// API endpoints
	mux.HandleFunc("/api/logs/stream", requireAuth(handleLogStream))
	mux.HandleFunc("/api/bootstrap", requireAuth(handleBootstrap))
	mux.HandleFunc("/api/config", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetSystemConfig(w, r)
		} else if r.Method == http.MethodPost {
			handleSaveSystemConfig(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))
	mux.HandleFunc("/api/status", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		handleStatus(w, r, state)
	}))
	mux.HandleFunc("/api/start", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		handleStart(w, r, state)
	}))
	mux.HandleFunc("/api/stop", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		handleStop(w, r, state)
	}))
	mux.HandleFunc("/api/simulation/metrics", requireAuth(handleSimulationMetrics))
	mux.HandleFunc("/api/simulation/devices", requireAuth(handleSimulationDevices))
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/api/organizations", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListOrganizations(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateOrganization(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	// DELETE/PUT /api/organizations/{id}
	mux.HandleFunc("/api/organizations/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/organizations/"):]
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organization id is required"})
			return
		}
		if r.Method == http.MethodDelete {
			handleDeleteOrganization(w, r, id)
		} else if r.Method == http.MethodPut {
			handleUpdateOrganization(w, r, id)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	// GET/POST /api/org-configs/{orgID}
	mux.HandleFunc("/api/org-configs/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		orgID := r.URL.Path[len("/api/org-configs/"):]
		if orgID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organization id is required"})
			return
		}
		if r.Method == http.MethodGet {
			handleGetOrgConfig(w, r, orgID)
		} else if r.Method == http.MethodPost {
			handleSaveOrgConfig(w, r, orgID)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/device-profiles", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListDeviceProfiles(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateDeviceProfile(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/device-profiles/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/device-profiles/"):]
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "device profile id is required"})
			return
		}
		if r.Method == http.MethodGet {
			handleGetDeviceProfile(w, r, id)
		} else if r.Method == http.MethodDelete {
			handleDeleteDeviceProfile(w, r, id)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/applications", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListApplications(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateApplication(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/applications/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/applications/"):]
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "application id is required"})
			return
		}
		handleDeleteApplication(w, r, id)
	}))

	mux.HandleFunc("/api/devices", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListDevices(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateDevice(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	mux.HandleFunc("/api/devices/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		devEUI := r.URL.Path[len("/api/devices/"):]
		if devEUI == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui is required"})
			return
		}
		handleDeleteDevice(w, r, devEUI)
	}))

	mux.HandleFunc("/api/device-intervals", requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			intervals, err := GetDeviceIntervals()
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"intervals": intervals})
		} else if r.Method == http.MethodPost {
			var req struct {
				DevEUI   string `json:"dev_eui"`
				Interval string `json:"interval"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
				return
			}
			if req.DevEUI == "" || req.Interval == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui ve interval zorunludur"})
				return
			}
			if err := SaveDeviceInterval(req.DevEUI, req.Interval); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}))

	// UI — serves embedded frontend files at root path
	mux.Handle("/", uiHandler())

	return &Server{
		Handler: mux,
		httpServer: &http.Server{
			Handler: mux,
			Addr:    bind,
		},
	}
}

// Start starts the HTTP API server (blocking).
func (s *Server) Start() error {
	log.WithField("bind", s.httpServer.Addr).Info("starting HTTP API server")
	return s.httpServer.ListenAndServe()
}

// Stop gracefully shuts down the HTTP API server.
func (s *Server) Stop(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// handleHealth responds with a simple health check.
func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": config.Version,
	})
}

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

	state.mu.Lock()
	if state.Status != StatusIdle && state.Status != StatusError {
		state.mu.Unlock()
		writeJSON(w, http.StatusConflict, map[string]interface{}{
			"error":  "simulation already running",
			"status": string(state.Status),
		})
		return
	}

	var req StartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		state.mu.Unlock()
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if err := validateStartRequest(&req); err != nil {
		state.mu.Unlock()
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

	// Load all saved configurations from SQLite.
	reqs, err := GetActiveOrgConfigs()
	if err != nil {
		log.WithError(err).Error("HTTP API: failed to get active org configs, using request config only")
	}

	// Merge active request config (potentially unsaved changes from drawer)
	found := false
	for i, r := range reqs {
		if r.TenantID == req.TenantID {
			reqs[i] = req
			found = true
			break
		}
	}
	if !found {
		reqs = append(reqs, req)
	}

	cfg := buildConfigFromList(reqs)
	state.Config = &req
	state.Status = StatusStarting
	state.StartedAt = time.Now().UnixMilli()
	sim_pkg.ActiveDevices.Clear()
	state.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}

	state.mu.Lock()
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

// buildConfigFromList converts a slice of StartRequests into a simulator config.Config.
func buildConfigFromList(reqs []StartRequest) config.Config {
	// Start from the global config (preserves ChirpStack, Prometheus settings).
	cfg := config.C
	cfg.Simulator = nil

	for _, req := range reqs {
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

		duration, _ := time.ParseDuration(req.Duration)
		activationTime, _ := time.ParseDuration(req.ActivationTime)
		uplinkInterval, _ := time.ParseDuration(req.UplinkInterval)

		simCfg := config.SimulatorConfig{
			TenantID:         req.TenantID,
			Duration:         duration,
			ActivationTime:   activationTime,
			AppName:          req.AppName,
			DeviceNamePrefix: req.DevicePrefix,
			PayloadScript:    req.PayloadScript,
			PacketLoss:       req.PacketLoss,
			LatencyMs:        req.LatencyMs,
		}

		simCfg.Device.Count = req.DeviceCount
		simCfg.Device.UplinkInterval = uplinkInterval
		simCfg.Device.FPort = req.FPort
		simCfg.Device.Payload = req.Payload
		simCfg.Device.Frequency = req.Frequency
		simCfg.Device.Bandwidth = req.Bandwidth
		simCfg.Device.SpreadingFactor = req.SpreadingFactor
		simCfg.Gateway.MinCount = req.GatewayCount
		simCfg.Gateway.MaxCount = req.GatewayCount
		simCfg.Gateway.EventTopicTemplate = req.EventTopicTemplate
		simCfg.Gateway.CommandTopicTemplate = req.CommandTopicTemplate

		// Load custom intervals for this simulation
		devIntervals, err := GetDeviceIntervals()
		if err == nil {
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

	return cfg
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
