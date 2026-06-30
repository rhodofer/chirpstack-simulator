package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	log "github.com/sirupsen/logrus"
)

const (
	dbKeyPassiveMode    = "passive_mode"
	dbKeySyncInterval   = "sync_interval_minutes"
	defaultSyncInterval = 5
)

// PassiveModeStatus is returned by GET /api/passive-mode.
type PassiveModeStatus struct {
	Enabled             bool   `json:"enabled"`
	SyncIntervalMinutes int    `json:"sync_interval_minutes"`
	LastSyncAt          string `json:"last_sync_at"`
	PendingChanges      bool   `json:"pending_changes"`
	ChangesSummary      []string `json:"changes_summary"`
}

// IsPassiveModeEnabled returns true when passive mode is stored as "true" in the DB.
func IsPassiveModeEnabled() bool {
	val, err := GetSystemState(dbKeyPassiveMode)
	if err != nil {
		return false
	}
	return val == "true"
}

// GetSyncInterval returns the configured sync interval in minutes (default: 5).
func GetSyncInterval() int {
	val, err := GetSystemState(dbKeySyncInterval)
	if err != nil || val == "" {
		return defaultSyncInterval
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 1 {
		return defaultSyncInterval
	}
	return n
}

// handleGetPassiveMode returns the current passive mode configuration.
func handleGetPassiveMode(w http.ResponseWriter, r *http.Request) {
	syncState.mu.RLock()
	defer syncState.mu.RUnlock()

	lastAt := ""
	if !syncState.LastSyncAt.IsZero() {
		lastAt = syncState.LastSyncAt.UTC().Format("2006-01-02T15:04:05Z")
	}

	resp := PassiveModeStatus{
		Enabled:             IsPassiveModeEnabled(),
		SyncIntervalMinutes: GetSyncInterval(),
		LastSyncAt:          lastAt,
		PendingChanges:      syncState.PendingChanges,
		ChangesSummary:      syncState.ChangesSummary,
	}
	writeJSON(w, http.StatusOK, resp)
}

// handleSavePassiveMode enables or disables passive mode and updates sync interval.
func handleSavePassiveMode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req struct {
		Enabled             bool `json:"enabled"`
		SyncIntervalMinutes int  `json:"sync_interval_minutes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}
	if req.SyncIntervalMinutes < 1 {
		req.SyncIntervalMinutes = defaultSyncInterval
	}

	enabledStr := "false"
	if req.Enabled {
		enabledStr = "true"
	}
	if err := SaveSystemState(dbKeyPassiveMode, enabledStr); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if err := SaveSystemState(dbKeySyncInterval, strconv.Itoa(req.SyncIntervalMinutes)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Restart sync goroutine with new settings
	if req.Enabled {
		StopPassiveSync()
		StartPassiveSync(req.SyncIntervalMinutes)
		log.WithField("interval_minutes", req.SyncIntervalMinutes).Info("passive_mode: enabled")
	} else {
		StopPassiveSync()
		log.Info("passive_mode: disabled")
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"enabled":               req.Enabled,
		"sync_interval_minutes": req.SyncIntervalMinutes,
	})
}

// handleGetSyncStatus returns current sync state (last sync time, pending changes).
func handleGetSyncStatus(w http.ResponseWriter, r *http.Request) {
	syncState.mu.RLock()
	defer syncState.mu.RUnlock()

	lastAt := ""
	if !syncState.LastSyncAt.IsZero() {
		lastAt = syncState.LastSyncAt.UTC().Format("2006-01-02T15:04:05Z")
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"last_sync_at":     lastAt,
		"pending_changes":  syncState.PendingChanges,
		"changes_summary":  syncState.ChangesSummary,
	})
}

// handleTriggerSync triggers an immediate manual topology sync.
func handleTriggerSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if !IsPassiveModeEnabled() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "passive mode is not enabled"})
		return
	}

	go func() {
		if err := TriggerManualSync(); err != nil {
			log.WithError(err).Warn("passive_sync: manual sync failed")
		}
	}()

	writeJSON(w, http.StatusOK, map[string]string{"status": "sync_triggered"})
}

// handleDismissChanges clears the pending changes flag without restarting.
func handleDismissChanges(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	syncState.mu.Lock()
	syncState.PendingChanges = false
	syncState.ChangesSummary = nil
	syncState.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}
