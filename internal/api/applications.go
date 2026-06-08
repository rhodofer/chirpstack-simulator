package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	log "github.com/sirupsen/logrus"
)

// Application represents a ChirpStack application returned by the API.
type Application struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	TenantID    string `json:"tenant_id"`
	Description string `json:"description,omitempty"`
}

// CreateApplicationRequest is the HTTP request body for creating an application.
type CreateApplicationRequest struct {
	Name        string `json:"name"`
	TenantID    string `json:"tenant_id"`
	Description string `json:"description"`
}

// handleListApplications returns all applications from ChirpStack, optionally filtered by tenant.
func handleListApplications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	tenantID := r.URL.Query().Get("tenant_id")
	var tenants []string
	if tenantID != "" {
		tenants = append(tenants, tenantID)
	} else {
		respTenants, err := as.Tenant().List(context.Background(), &api.ListTenantsRequest{Limit: 100})
		if err != nil {
			log.WithError(err).Error("applications: list tenants error")
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
			})
			return
		}
		for _, t := range respTenants.GetResult() {
			tenants = append(tenants, t.GetId())
		}
	}

	apps := []Application{}
	for _, tID := range tenants {
		req := &api.ListApplicationsRequest{Limit: 100, TenantId: tID}
		resp, err := as.Application().List(context.Background(), req)
		if err != nil {
			log.WithError(err).Warnf("applications: list error for tenant %s", tID)
			continue
		}
		for _, a := range resp.GetResult() {
			apps = append(apps, Application{
				ID:          a.GetId(),
				Name:        a.GetName(),
				TenantID:    tID,
				Description: a.GetDescription(),
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"applications": apps,
		"count":        len(apps),
	})
}

// handleCreateApplication creates a new application in ChirpStack.
func handleCreateApplication(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req CreateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "uygulama adı zorunludur"})
		return
	}
	if req.TenantID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tenant_id zorunludur"})
		return
	}

	resp, err := as.Application().Create(context.Background(), &api.CreateApplicationRequest{
		Application: &api.Application{
			Name:        req.Name,
			TenantId:    req.TenantID,
			Description: req.Description,
		},
	})
	if err != nil {
		log.WithError(err).WithField("name", req.Name).Error("applications: create error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
		})
		return
	}

	log.WithFields(log.Fields{"id": resp.GetId(), "name": req.Name}).Info("applications: created")

	writeJSON(w, http.StatusCreated, Application{
		ID:          resp.GetId(),
		Name:        req.Name,
		TenantID:    req.TenantID,
		Description: req.Description,
	})
}

// handleDeleteApplication deletes an application from ChirpStack.
func handleDeleteApplication(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	_, err := as.Application().Delete(context.Background(), &api.DeleteApplicationRequest{Id: id})
	if err != nil {
		log.WithError(err).WithField("id", id).Error("applications: delete error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
		})
		return
	}

	log.WithField("id", id).Info("applications: deleted")
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": id})
}
