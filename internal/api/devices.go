package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	log "github.com/sirupsen/logrus"
)

// Device represents a ChirpStack device returned by the API.
type Device struct {
	DevEUI          string `json:"dev_eui"`
	Name            string `json:"name"`
	ApplicationID   string `json:"application_id"`
	DeviceProfileID string `json:"device_profile_id"`
	Description     string `json:"description,omitempty"`
	IsDisabled      bool   `json:"is_disabled"`
	TenantID        string `json:"tenant_id"`
}

// CreateDeviceRequest is the HTTP request body for creating a device.
type CreateDeviceRequest struct {
	DevEUI          string `json:"dev_eui"`
	Name            string `json:"name"`
	ApplicationID   string `json:"application_id"`
	DeviceProfileID string `json:"device_profile_id"`
	Description     string `json:"description"`
	IsDisabled      bool   `json:"is_disabled"`
}

// handleListDevices returns all devices from ChirpStack, filtered by application or tenant.
func handleListDevices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API bağlantısı kurulmadı"})
		return
	}

	applicationID := r.URL.Query().Get("application_id")
	tenantID := r.URL.Query().Get("tenant_id")
	var apps []string
	appTenantMap := make(map[string]string)

	if applicationID != "" {
		apps = append(apps, applicationID)
		respApp, err := as.Application().Get(context.Background(), &api.GetApplicationRequest{Id: applicationID})
		if err == nil {
			appTenantMap[applicationID] = respApp.GetApplication().GetTenantId()
		}
	} else if tenantID != "" {
		respApps, err := as.Application().List(context.Background(), &api.ListApplicationsRequest{Limit: 100, TenantId: tenantID})
		if err == nil {
			for _, a := range respApps.GetResult() {
				apps = append(apps, a.GetId())
				appTenantMap[a.GetId()] = tenantID
			}
		} else {
			log.WithError(err).Warnf("devices: list apps error for tenant %s", tenantID)
		}
	} else {
		respTenants, err := as.Tenant().List(context.Background(), &api.ListTenantsRequest{Limit: 100})
		if err != nil {
			log.WithError(err).Error("devices: list tenants error")
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": "ChirpStack API'ye bağlanılamadı: " + err.Error(),
			})
			return
		}
		for _, t := range respTenants.GetResult() {
			respApps, err := as.Application().List(context.Background(), &api.ListApplicationsRequest{Limit: 100, TenantId: t.GetId()})
			if err != nil {
				log.WithError(err).Warnf("devices: list apps error for tenant %s", t.GetId())
				continue
			}
			for _, a := range respApps.GetResult() {
				apps = append(apps, a.GetId())
				appTenantMap[a.GetId()] = t.GetId()
			}
		}
	}

	devices := []Device{}
	for _, appID := range apps {
		req := &api.ListDevicesRequest{Limit: 100, ApplicationId: appID}
		resp, err := as.Device().List(context.Background(), req)
		if err != nil {
			log.WithError(err).Warnf("devices: list error for application %s", appID)
			continue
		}
		for _, d := range resp.GetResult() {
			devices = append(devices, Device{
				DevEUI:          d.GetDevEui(),
				Name:            d.GetName(),
				ApplicationID:   appID,
				DeviceProfileID: d.GetDeviceProfileId(),
				Description:     d.GetDescription(),
				TenantID:        appTenantMap[appID],
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"devices": devices,
		"count":   len(devices),
	})
}

// handleCreateDevice creates a new device in ChirpStack.
func handleCreateDevice(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	var req CreateDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if req.DevEUI == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui is required"})
		return
	}
	if len(req.DevEUI) != 16 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui must be 16 hex characters (8 bytes)"})
		return
	}
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "device name is required"})
		return
	}
	if req.ApplicationID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "application_id is required"})
		return
	}
	if req.DeviceProfileID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "device_profile_id is required"})
		return
	}

	_, err := as.Device().Create(context.Background(), &api.CreateDeviceRequest{
		Device: &api.Device{
			DevEui:          req.DevEUI,
			Name:            req.Name,
			ApplicationId:   req.ApplicationID,
			DeviceProfileId: req.DeviceProfileID,
			Description:     req.Description,
			IsDisabled:      req.IsDisabled,
		},
	})
	if err != nil {
		log.WithError(err).WithField("dev_eui", req.DevEUI).Error("devices: create error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	log.WithFields(log.Fields{
		"dev_eui": req.DevEUI,
		"name":    req.Name,
	}).Info("devices: created")

	writeJSON(w, http.StatusCreated, Device{
		DevEUI:          req.DevEUI,
		Name:            req.Name,
		ApplicationID:   req.ApplicationID,
		DeviceProfileID: req.DeviceProfileID,
		Description:     req.Description,
		IsDisabled:      req.IsDisabled,
	})
}

// handleDeleteDevice deletes a device from ChirpStack by its DevEUI.
func handleDeleteDevice(w http.ResponseWriter, r *http.Request, devEUI string) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	_, err := as.Device().Delete(context.Background(), &api.DeleteDeviceRequest{DevEui: devEUI})
	if err != nil {
		log.WithError(err).WithField("dev_eui", devEUI).Error("devices: delete error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	log.WithField("dev_eui", devEUI).Info("devices: deleted")
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "dev_eui": devEUI})
}
