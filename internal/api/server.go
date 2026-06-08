package api

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/brocaar/chirpstack-simulator/internal/simulator"
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

	// API endpoints
	mux.HandleFunc("/api/logs/stream", handleLogStream)
	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		handleStatus(w, r, state)
	})
	mux.HandleFunc("/api/start", func(w http.ResponseWriter, r *http.Request) {
		handleStart(w, r, state)
	})
	mux.HandleFunc("/api/stop", func(w http.ResponseWriter, r *http.Request) {
		handleStop(w, r, state)
	})
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/api/organizations", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListOrganizations(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateOrganization(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	})

	// DELETE /api/organizations/{id}
	mux.HandleFunc("/api/organizations/", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/organizations/"):]
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organization id is required"})
			return
		}
		handleDeleteOrganization(w, r, id)
	})

	// GET/POST /api/org-configs/{orgID}
	mux.HandleFunc("/api/org-configs/", func(w http.ResponseWriter, r *http.Request) {
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
	})

	mux.HandleFunc("/api/device-profiles", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListDeviceProfiles(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateDeviceProfile(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	})

	mux.HandleFunc("/api/device-profiles/", func(w http.ResponseWriter, r *http.Request) {
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
	})

	mux.HandleFunc("/api/applications", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListApplications(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateApplication(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	})

	mux.HandleFunc("/api/applications/", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Path[len("/api/applications/"):]
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "application id is required"})
			return
		}
		handleDeleteApplication(w, r, id)
	})

	mux.HandleFunc("/api/devices", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleListDevices(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateDevice(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	})

	mux.HandleFunc("/api/devices/", func(w http.ResponseWriter, r *http.Request) {
		devEUI := r.URL.Path[len("/api/devices/"):]
		if devEUI == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui is required"})
			return
		}
		handleDeleteDevice(w, r, devEUI)
	})

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

	writeJSON(w, http.StatusOK, resp)
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
			"error":  "simülasyon zaten çalışıyor",
			"status": string(state.Status),
		})
		return
	}

	var req StartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		state.mu.Unlock()
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
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
		req.UplinkInterval = "30s"
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

	cfg := buildConfig(req)
	state.Config = &req
	state.Status = StatusStarting
	state.StartedAt = time.Now().UnixMilli()
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

		log.Info("HTTP API: simülasyon tamamlandı")
	}()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "starting",
		"message": "Simülasyon başlatılıyor...",
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
			"error":  "simülasyon zaten durmuş",
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
		"message": "Simülasyon durduruluyor...",
	})
}

// buildConfig converts an HTTP API StartRequest into a simulator config.Config.
func buildConfig(req StartRequest) config.Config {
	duration, _ := time.ParseDuration(req.Duration)
	activationTime, _ := time.ParseDuration(req.ActivationTime)
	uplinkInterval, _ := time.ParseDuration(req.UplinkInterval)

	// Start from the global config (preserves ChirpStack, Prometheus settings).
	cfg := config.C

	// Override simulator with single entry from HTTP request.
	cfg.Simulator = []struct {
		TenantID         string        `mapstructure:"tenant_id"`
		Duration         time.Duration `mapstructure:"duration"`
		ActivationTime   time.Duration `mapstructure:"activation_time"`
		AppName          string        `mapstructure:"app_name"`
		DeviceNamePrefix string        `mapstructure:"device_name_prefix"`
		Device           struct {
			Count           int           `mapstructure:"count"`
			UplinkInterval  time.Duration `mapstructure:"uplink_interval"`
			FPort           uint8         `mapstructure:"f_port"`
			Payload         string        `mapstructure:"payload"`
			Frequency       int           `mapstructure:"frequency"`
			Bandwidth       int           `mapstructure:"bandwidth"`
			SpreadingFactor int           `mapstructure:"spreading_factor"`
		} `mapstructure:"device"`
		Gateway struct {
			MinCount             int    `mapstructure:"min_count"`
			MaxCount             int    `mapstructure:"max_count"`
			EventTopicTemplate   string `mapstructure:"event_topic_template"`
			CommandTopicTemplate string `mapstructure:"command_topic_template"`
		} `mapstructure:"gateway"`
	}{{
		TenantID:         req.TenantID,
		Duration:         duration,
		ActivationTime:   activationTime,
		AppName:          req.AppName,
		DeviceNamePrefix: req.DevicePrefix,
	}}

	cfg.Simulator[0].Device.Count = req.DeviceCount
	cfg.Simulator[0].Device.UplinkInterval = uplinkInterval
	cfg.Simulator[0].Device.FPort = req.FPort
	cfg.Simulator[0].Device.Payload = req.Payload
	cfg.Simulator[0].Device.Frequency = req.Frequency
	cfg.Simulator[0].Device.Bandwidth = req.Bandwidth
	cfg.Simulator[0].Device.SpreadingFactor = req.SpreadingFactor
	cfg.Simulator[0].Gateway.MinCount = req.GatewayCount
	cfg.Simulator[0].Gateway.MaxCount = req.GatewayCount
	cfg.Simulator[0].Gateway.EventTopicTemplate = req.EventTopicTemplate
	cfg.Simulator[0].Gateway.CommandTopicTemplate = req.CommandTopicTemplate

	return cfg
}
