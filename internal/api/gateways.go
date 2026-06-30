package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/chirpstack/chirpstack/api/go/v4/common"
	log "github.com/sirupsen/logrus"
)

// Gateway represents a ChirpStack gateway returned by the API.
type Gateway struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	TenantID    string `json:"tenant_id"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at,omitempty"`
}

// CreateGatewayRequest is the HTTP request body for creating a gateway.
type CreateGatewayRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	TenantID    string `json:"tenant_id"`
	Description string `json:"description"`
}

// handleListGateways returns all gateways from ChirpStack, optionally filtered by tenant.
func handleListGateways(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API bağlantısı kurulmadı"})
		return
	}

	tenantID := r.URL.Query().Get("tenant_id")
	var tenants []string
	if tenantID != "" {
		tenants = append(tenants, tenantID)
	} else {
		respTenants, err := as.Tenant().List(context.Background(), &api.ListTenantsRequest{Limit: 100})
		if err != nil {
			log.WithError(err).Error("gateways: list tenants error")
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
			})
			return
		}
		for _, t := range respTenants.GetResult() {
			tenants = append(tenants, t.GetId())
		}
	}

	gws := []Gateway{}
	for _, tID := range tenants {
		req := &api.ListGatewaysRequest{Limit: 100, TenantId: tID}
		resp, err := as.Gateway().List(context.Background(), req)
		if err != nil {
			log.WithError(err).Warnf("gateways: list error for tenant %s", tID)
			continue
		}
		for _, g := range resp.GetResult() {
			createdAtStr := ""
			if g.GetCreatedAt() != nil {
				createdAtStr = g.GetCreatedAt().AsTime().Format("2006-01-02 15:04:05")
			}
			gws = append(gws, Gateway{
				ID:          g.GetGatewayId(),
				Name:        g.GetName(),
				TenantID:    tID,
				Description: g.GetDescription(),
				CreatedAt:   createdAtStr,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"gateways": gws,
		"count":    len(gws),
	})
}

// handleCreateGateway creates a new gateway in ChirpStack.
func handleCreateGateway(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API bağlantısı kurulmadı"})
		return
	}

	var req CreateGatewayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
		return
	}

	if req.ID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçit ID'si (EUI64) zorunludur"})
		return
	}
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçit adı zorunludur"})
		return
	}
	if req.TenantID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tenant_id zorunludur"})
		return
	}

	_, err := as.Gateway().Create(context.Background(), &api.CreateGatewayRequest{
		Gateway: &api.Gateway{
			GatewayId:   req.ID,
			Name:        req.Name,
			Description: req.Description,
			TenantId:    req.TenantID,
			Location:    &common.Location{},
		},
	})
	if err != nil {
		log.WithError(err).WithField("id", req.ID).Error("gateways: create error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
		})
		return
	}

	log.WithFields(log.Fields{"id": req.ID, "name": req.Name}).Info("gateways: created")

	writeJSON(w, http.StatusCreated, Gateway{
		ID:          req.ID,
		Name:        req.Name,
		TenantID:    req.TenantID,
		Description: req.Description,
	})
}

// handleDeleteGateway deletes a gateway from ChirpStack.
func handleDeleteGateway(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API bağlantısı kurulmadı"})
		return
	}

	_, err := as.Gateway().Delete(context.Background(), &api.DeleteGatewayRequest{GatewayId: id})
	if err != nil {
		log.WithError(err).WithField("id", id).Error("gateways: delete error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
		})
		return
	}

	log.WithField("id", id).Info("gateways: deleted")
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": id})
}
