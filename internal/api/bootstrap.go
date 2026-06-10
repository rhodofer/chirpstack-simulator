package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/chirpstack/chirpstack/api/go/v4/common"
	log "github.com/sirupsen/logrus"
)

type BootstrapDeviceConfig struct {
	DeviceIndex  int    `json:"device_index"`
	Interval     string `json:"interval"`
	ProfileIndex int    `json:"profile_index"`
}

// BootstrapRequest defines the body for batch creating simulator infrastructure.
type BootstrapRequest struct {
	OrgName       string                  `json:"org_name"`
	AppPrefix     string                  `json:"app_prefix"`
	AppCount      int                     `json:"app_count"`
	DpPrefix      string                  `json:"dp_prefix"`
	DpCount       int                     `json:"dp_count"`
	DevPrefix     string                  `json:"dev_prefix"`
	DevCount      int                     `json:"dev_count"`
	DevicesConfig []BootstrapDeviceConfig `json:"devices_config"`
}

// handleBootstrap batch creates organization, network applications, device profiles, and devices.
func handleBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if !as.IsConnected() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ChirpStack API bağlantısı kurulmadı"})
		return
	}

	var req BootstrapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
		return
	}

	// Validate inputs
	if req.OrgName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "organizasyon adı zorunludur"})
		return
	}
	if req.AppCount < 1 || req.AppPrefix == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "en az 1 ağ uygulaması ve geçerli bir prefix olmalıdır"})
		return
	}
	if req.DpCount < 1 || req.DpPrefix == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "en az 1 cihaz profili ve geçerli bir prefix olmalıdır"})
		return
	}
	if req.DevCount < 1 || req.DevPrefix == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "en az 1 cihaz ve geçerli bir prefix olmalıdır"})
		return
	}

	ctx := context.Background()

	// 1. Create Tenant (Organization)
	tenantResp, err := as.Tenant().Create(ctx, &api.CreateTenantRequest{
		Tenant: &api.Tenant{
			Name:            req.OrgName,
			Description:     "Hızlı Kurulum Sihirbazı ile oluşturuldu",
			CanHaveGateways: true,
		},
	})
	if err != nil {
		log.WithError(err).Errorf("bootstrap: failed to create tenant %s", req.OrgName)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "organizasyon oluşturulamadı: " + err.Error()})
		return
	}
	tenantID := tenantResp.GetId()
	log.Infof("bootstrap: created tenant %s (id: %s)", req.OrgName, tenantID)

	// Save a default simulation config for this organization so it runs in parallel simulations
	defaultCfg := StartRequest{
		TenantID:             tenantID,
		DeviceCount:          req.DevCount,
		GatewayCount:         1,
		Duration:             "0s",
		ActivationTime:       "30s",
		UplinkInterval:       "2m",
		AppName:              req.OrgName,
		DevicePrefix:         req.DevPrefix,
		FPort:                10,
		Payload:              "001903F521", // 5-byte payload triggers dynamic telemetry logging
		Frequency:            868100000,
		Bandwidth:            125000,
		SpreadingFactor:      7,
		EventTopicTemplate:   "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
		CommandTopicTemplate: "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}",
	}
	if err := SaveOrgConfig(tenantID, &defaultCfg); err != nil {
		log.WithError(err).Warnf("bootstrap: failed to save default simulation config for org %s", req.OrgName)
	}


	// 2. Create Device Profiles
	type ResourceDetail struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}

	dpIDs := make([]string, 0, req.DpCount)
	dpDetails := make([]ResourceDetail, 0, req.DpCount)
	for i := 1; i <= req.DpCount; i++ {
		dpName := fmt.Sprintf("%s-%s-%d", req.OrgName, req.DpPrefix, i)
		dpResp, err := as.DeviceProfile().Create(ctx, &api.CreateDeviceProfileRequest{
			DeviceProfile: &api.DeviceProfile{
				Name:              dpName,
				TenantId:          tenantID,
				MacVersion:        common.MacVersion_LORAWAN_1_0_3,
				RegParamsRevision: common.RegParamsRevision_B,
				SupportsOtaa:      true,
				Region:            common.Region_EU868,
				AdrAlgorithmId:    "default",
			},
		})
		if err != nil {
			log.WithError(err).Errorf("bootstrap: failed to create device profile %s", dpName)
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("cihaz profili %s oluşturulamadı: %s", dpName, err.Error())})
			return
		}
		dpIDs = append(dpIDs, dpResp.GetId())
		dpDetails = append(dpDetails, ResourceDetail{ID: dpResp.GetId(), Name: dpName})
		log.Infof("bootstrap: created device profile %s (id: %s)", dpName, dpResp.GetId())
	}

	// 3. Create Network Applications and Devices
	appDetails := make([]ResourceDetail, 0, req.AppCount)
	createdAppsCount := 0
	createdDevicesCount := 0

	for i := 1; i <= req.AppCount; i++ {
		appName := fmt.Sprintf("%s-%s-%d", req.OrgName, req.AppPrefix, i)
		appResp, err := as.Application().Create(ctx, &api.CreateApplicationRequest{
			Application: &api.Application{
				Name:        appName,
				Description: fmt.Sprintf("%s uygulaması", appName),
				TenantId:    tenantID,
			},
		})
		if err != nil {
			log.WithError(err).Errorf("bootstrap: failed to create application %s", appName)
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("uygulama %s oluşturulamadı: %s", appName, err.Error())})
			return
		}
		appID := appResp.GetId()
		createdAppsCount++
		appDetails = append(appDetails, ResourceDetail{ID: appID, Name: appName})
		log.Infof("bootstrap: created application %s (id: %s)", appName, appID)

		// Create Devices under this application
		for j := 1; j <= req.DevCount; j++ {
			devName := fmt.Sprintf("%s-%s-%d", appName, req.DevPrefix, j)

			// Generate random DevEUI and AppKey
			var devEUIBytes [8]byte
			var appKeyBytes [16]byte
			if _, err := rand.Read(devEUIBytes[:]); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "rastgele DevEUI üretilemedi"})
				return
			}
			if _, err := rand.Read(appKeyBytes[:]); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "rastgele AppKey üretilemedi"})
				return
			}
			devEUIStr := hex.EncodeToString(devEUIBytes[:])
			appKeyStr := hex.EncodeToString(appKeyBytes[:])

			// Select device profile and interval based on slot index
			dpID := dpIDs[(j-1) % len(dpIDs)]
			interval := "2m"

			for _, dCfg := range req.DevicesConfig {
				if dCfg.DeviceIndex == j {
					if dCfg.ProfileIndex >= 1 && dCfg.ProfileIndex <= len(dpIDs) {
						dpID = dpIDs[dCfg.ProfileIndex - 1]
					}
					if dCfg.Interval != "" {
						interval = dCfg.Interval
					}
					break
				}
			}

			_, err = as.Device().Create(ctx, &api.CreateDeviceRequest{
				Device: &api.Device{
					DevEui:          devEUIStr,
					Name:            devName,
					Description:     fmt.Sprintf("%s cihazı", devName),
					ApplicationId:   appID,
					DeviceProfileId: dpID,
				},
			})
			if err != nil {
				log.WithError(err).Errorf("bootstrap: failed to create device %s", devName)
				writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("cihaz %s oluşturulamadı: %s", devName, err.Error())})
				return
			}

			_, err = as.Device().CreateKeys(ctx, &api.CreateDeviceKeysRequest{
				DeviceKeys: &api.DeviceKeys{
					DevEui: devEUIStr,
					NwkKey: appKeyStr,
				},
			})
			if err != nil {
				log.WithError(err).Errorf("bootstrap: failed to create keys for device %s", devName)
				writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("cihaz anahtarları %s oluşturulamadı: %s", devName, err.Error())})
				return
			}

			// Save configured interval for this device
			if err := SaveDeviceInterval(devEUIStr, interval); err != nil {
				log.WithError(err).Warnf("bootstrap: failed to save interval for device %s", devName)
			}

			createdDevicesCount++
			log.Infof("bootstrap: created device %s (eui: %s)", devName, devEUIStr)
		}
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"status":        "success",
		"tenant_id":     tenantID,
		"tenant_name":   req.OrgName,
		"profiles":      dpDetails,
		"applications":  appDetails,
		"devices_count": createdDevicesCount,
		"message":       fmt.Sprintf("Başarıyla %d cihaz profili, %d ağ uygulaması ve %d cihaz oluşturuldu.", len(dpIDs), createdAppsCount, createdDevicesCount),
	})
}
