package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/brocaar/chirpstack-simulator/internal/config"
	log "github.com/sirupsen/logrus"
)

// Server holds the HTTP API server.
type Server struct {
	Handler    http.Handler // exported for testing via httptest
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
		} else if r.Method == http.MethodPut {
			handleUpdateDeviceProfile(w, r, id)
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
		if r.Method == http.MethodDelete {
			handleDeleteApplication(w, r, id)
		} else if r.Method == http.MethodPut {
			handleUpdateApplication(w, r, id)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
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
		handleDeviceByID(w, r, devEUI)
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
