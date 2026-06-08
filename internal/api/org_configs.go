package api

import (
	"encoding/json"
	"net/http"

	log "github.com/sirupsen/logrus"
)

// handleGetOrgConfig handles GET request to load simulation config for an organization.
func handleGetOrgConfig(w http.ResponseWriter, r *http.Request, orgID string) {
	cfg, err := GetOrgConfig(orgID)
	if err != nil {
		log.WithError(err).WithField("org_id", orgID).Error("org_configs: get config error")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Veritabanı hatası: " + err.Error()})
		return
	}

	if cfg == nil {
		// No config stored yet, return empty object or 404. Let's return an empty object with 200
		// so frontend can use defaults.
		writeJSON(w, http.StatusOK, map[string]interface{}{})
		return
	}

	writeJSON(w, http.StatusOK, cfg)
}

// handleSaveOrgConfig handles POST request to save/update simulation config for an organization.
func handleSaveOrgConfig(w http.ResponseWriter, r *http.Request, orgID string) {
	var req StartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
		return
	}

	err := SaveOrgConfig(orgID, &req)
	if err != nil {
		log.WithError(err).WithField("org_id", orgID).Error("org_configs: save config error")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Veritabanı kaydetme hatası: " + err.Error()})
		return
	}

	log.WithField("org_id", orgID).Info("org_configs: configuration saved")
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
