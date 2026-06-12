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

// DeviceProfile represents a ChirpStack device profile returned by the API.
type DeviceProfile struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	TenantID            string `json:"tenant_id"`
	Description         string `json:"description,omitempty"`
	MacVersion          string `json:"mac_version"`
	RegParamsRevision   string `json:"reg_params_revision"`
	SupportsOtaa        bool   `json:"supports_otaa"`
	SupportsClassB      bool   `json:"supports_class_b"`
	SupportsClassC      bool   `json:"supports_class_c"`
	Region              string `json:"region"`
	AdrAlgorithmId      string `json:"adr_algorithm_id"`
}

// CreateDeviceProfileRequest is the HTTP request body for creating a device profile.
type CreateDeviceProfileRequest struct {
	Name                string `json:"name"`
	TenantID            string `json:"tenant_id"`
	Description         string `json:"description"`
	MacVersion          string `json:"mac_version"`
	RegParamsRevision   string `json:"reg_params_revision"`
	SupportsOtaa        bool   `json:"supports_otaa"`
	SupportsClassB      bool   `json:"supports_class_b"`
	SupportsClassC      bool   `json:"supports_class_c"`
	Region              string `json:"region"`
	AdrAlgorithmId      string `json:"adr_algorithm_id"`
}

func mapDeviceProfile(dp *api.DeviceProfile) DeviceProfile {
	if dp == nil {
		return DeviceProfile{}
	}
	return DeviceProfile{
		ID:                  dp.GetId(),
		Name:                dp.GetName(),
		TenantID:            dp.GetTenantId(),
		Description:         dp.GetDescription(),
		MacVersion:          dp.GetMacVersion().String(),
		RegParamsRevision:   dp.GetRegParamsRevision().String(),
		SupportsOtaa:        dp.GetSupportsOtaa(),
		SupportsClassB:      dp.GetSupportsClassB(),
		SupportsClassC:      dp.GetSupportsClassC(),
		Region:              dp.GetRegion().String(),
		AdrAlgorithmId:      dp.GetAdrAlgorithmId(),
	}
}

func handleListDeviceProfiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	tenantID := r.URL.Query().Get("tenant_id")
	var tenants []string
	if tenantID != "" {
		tenants = append(tenants, tenantID)
	} else {
		respTenants, err := as.Tenant().List(context.Background(), &api.ListTenantsRequest{Limit: 100})
		if err != nil {
			log.WithError(err).Error("device-profiles: list tenants error")
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": "Failed to connect to ChirpStack API: " + err.Error(),
			})
			return
		}
		for _, t := range respTenants.GetResult() {
			tenants = append(tenants, t.GetId())
		}
	}

	profiles := []DeviceProfile{}
	for _, tID := range tenants {
		req := &api.ListDeviceProfilesRequest{Limit: 100, TenantId: tID}
		resp, err := as.DeviceProfile().List(context.Background(), req)
		if err != nil {
			log.WithError(err).Warnf("device-profiles: list error for tenant %s", tID)
			continue
		}
		for _, dp := range resp.GetResult() {
			// Fetch full device profile details to get full DeviceProfile struct
			fullDp, err := as.DeviceProfile().Get(context.Background(), &api.GetDeviceProfileRequest{Id: dp.GetId()})
			if err != nil {
				log.WithError(err).WithField("id", dp.GetId()).Error("device-profiles: list get detail error")
				continue
			}
			profiles = append(profiles, mapDeviceProfile(fullDp.GetDeviceProfile()))
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"device_profiles": profiles,
		"count":           len(profiles),
	})
}

func handleGetDeviceProfile(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	resp, err := as.DeviceProfile().Get(context.Background(), &api.GetDeviceProfileRequest{Id: id})
	if err != nil {
		log.WithError(err).WithField("id", id).Error("device-profiles: get error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, mapDeviceProfile(resp.GetDeviceProfile()))
}

func handleCreateDeviceProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	var req CreateDeviceProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "profile name is required"})
		return
	}
	if req.TenantID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tenant_id is required"})
		return
	}

	macVersion := common.MacVersion_LORAWAN_1_0_3
	if v, ok := common.MacVersion_value[req.MacVersion]; ok {
		macVersion = common.MacVersion(v)
	}

	regParamsRev := common.RegParamsRevision_B
	if v, ok := common.RegParamsRevision_value[req.RegParamsRevision]; ok {
		regParamsRev = common.RegParamsRevision(v)
	}

	region := common.Region_EU868
	if v, ok := common.Region_value[req.Region]; ok {
		region = common.Region(v)
	}

	profile := &api.DeviceProfile{
		Name:              req.Name,
		TenantId:          req.TenantID,
		Description:       req.Description,
		MacVersion:        macVersion,
		RegParamsRevision: regParamsRev,
		SupportsOtaa:      req.SupportsOtaa,
		SupportsClassB:    req.SupportsClassB,
		SupportsClassC:    req.SupportsClassC,
		Region:            region,
		AdrAlgorithmId:    req.AdrAlgorithmId,
	}

	if req.AdrAlgorithmId == "" {
		profile.AdrAlgorithmId = "default"
	}

	resp, err := as.DeviceProfile().Create(context.Background(), &api.CreateDeviceProfileRequest{
		DeviceProfile: profile,
	})
	if err != nil {
		log.WithError(err).WithField("name", req.Name).Error("device-profiles: create error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	log.WithFields(log.Fields{"id": resp.GetId(), "name": req.Name}).Info("device-profiles: created")

	writeJSON(w, http.StatusCreated, DeviceProfile{
		ID:                  resp.GetId(),
		Name:                req.Name,
		TenantID:            req.TenantID,
		Description:         req.Description,
		MacVersion:          macVersion.String(),
		RegParamsRevision:   regParamsRev.String(),
		SupportsOtaa:        req.SupportsOtaa,
		SupportsClassB:      req.SupportsClassB,
		SupportsClassC:      req.SupportsClassC,
		Region:              region.String(),
		AdrAlgorithmId:      profile.AdrAlgorithmId,
	})
}

func handleDeleteDeviceProfile(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	_, err := as.DeviceProfile().Delete(context.Background(), &api.DeleteDeviceProfileRequest{Id: id})
	if err != nil {
		log.WithError(err).WithField("id", id).Error("device-profiles: delete error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	log.WithField("id", id).Info("device-profiles: deleted")
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": id})
}

func handleUpdateDeviceProfile(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API connection not established"})
		return
	}

	var req CreateDeviceProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "profile name is required"})
		return
	}

	macVersion := common.MacVersion_LORAWAN_1_0_3
	if v, ok := common.MacVersion_value[req.MacVersion]; ok {
		macVersion = common.MacVersion(v)
	}

	regParamsRev := common.RegParamsRevision_B
	if v, ok := common.RegParamsRevision_value[req.RegParamsRevision]; ok {
		regParamsRev = common.RegParamsRevision(v)
	}

	region := common.Region_EU868
	if v, ok := common.Region_value[req.Region]; ok {
		region = common.Region(v)
	}

	profile := &api.DeviceProfile{
		Id:                id,
		Name:              req.Name,
		TenantId:          req.TenantID,
		Description:       req.Description,
		MacVersion:        macVersion,
		RegParamsRevision: regParamsRev,
		SupportsOtaa:      req.SupportsOtaa,
		SupportsClassB:    req.SupportsClassB,
		SupportsClassC:    req.SupportsClassC,
		Region:            region,
		AdrAlgorithmId:    req.AdrAlgorithmId,
	}

	if req.AdrAlgorithmId == "" {
		profile.AdrAlgorithmId = "default"
	}

	_, err := as.DeviceProfile().Update(context.Background(), &api.UpdateDeviceProfileRequest{
		DeviceProfile: profile,
	})
	if err != nil {
		log.WithError(err).WithField("id", id).Error("device-profiles: update error")
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Failed to connect to ChirpStack API: " + err.Error(),
		})
		return
	}

	log.WithFields(log.Fields{"id": id, "name": req.Name}).Info("device-profiles: updated")

	writeJSON(w, http.StatusOK, mapDeviceProfile(profile))
}

