package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

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
	Scenario      string                  `json:"scenario"`
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

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// 1. Create or Find Tenant (Organization)
	var tenantID string

	listTenantsResp, err := as.Tenant().List(ctx, &api.ListTenantsRequest{
		Limit: 100,
	})
	if err == nil {
		for _, t := range listTenantsResp.GetResult() {
			if t.GetName() == req.OrgName {
				tenantID = t.GetId()
				log.Infof("bootstrap: tenant %s already exists (id: %s), reusing it", req.OrgName, tenantID)
				break
			}
		}
	} else {
		log.WithError(err).Warn("bootstrap: failed to list tenants, trying to create instead")
	}

	if tenantID == "" {
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
		tenantID = tenantResp.GetId()
		log.Infof("bootstrap: created tenant %s (id: %s)", req.OrgName, tenantID)
	}

	// Save a default simulation config for this organization so it runs in parallel simulations
	defaultCfg := StartRequest{
		TenantID:             tenantID,
		DeviceCount:          req.DevCount,
		GatewayCount:         1,
		Duration:             "0s",
		ActivationTime:       "30s",
		UplinkInterval:       "2m",
		AppName:              fmt.Sprintf("%s-%s-1", req.OrgName, req.AppPrefix),
		DevicePrefix:         req.DevPrefix,
		FPort:                10,
		Payload:              "001903F521", // 5-byte payload triggers dynamic telemetry logging
		Frequency:            868100000,
		Bandwidth:            125000,
		SpreadingFactor:      7,
		EventTopicTemplate:   "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
		CommandTopicTemplate: "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}",
		PassiveMode:          false,
		SyncIntervalMinutes:  5,
	}

	if req.Scenario == "batman_oil" {
		defaultCfg.PayloadScript = `// Batman Raman Petrol Sahasi - Kuyu Telemetri Sensor Simulasyonu
// 5 Sensor: Pompa Durumu, Kuyu Basi Basinci, Anlik Akis Hizi, Depolama Tank Seviyesi, Motor Sicakligi

// 1. Pompa Durumu (Pump Status): %95 oraninda Aktif (1), %5 ariza/bakim (0)
var pumpActive = (fCnt % 40 === 0) ? 0 : 1; 

// 2. Kuyu Basi Basinci (Pressure): Pompa aktifse 45-65 psi arasi, kapaliysa 10 psi'a duser
var pressure = pumpActive ? (55 + Math.sin(fCnt * 0.1) * 8 + (Math.random() - 0.5) * 2) : 10.0;

// 3. Anlik Akis Hizi (Flow Rate): Pompa aktifse basinca bagli olarak 120-180 varil/gun arasi, kapaliysa 0
var flowRate = pumpActive ? (pressure * 2.8 + (Math.random() - 0.5) * 5) : 0.0;

// 4. Depolama Tank Seviyesi (Tank Level): Her aktif adimda tank dolulugu %0.4 artar. %100'e ulastiginda tankerle tahliye edilip %0'a duser.
var tankFillRate = 0.4;
var currentTankVal = (fCnt * tankFillRate) % 100.0;

// 5. Motor Sicakligi (Motor Temp): Pompa aktifken 60-80 C arasi dalgalanir, kapaliysa 25 C (ortam sicakligi)
var motorTemp = pumpActive ? (70 + Math.cos(fCnt * 0.08) * 8 + (Math.random() - 0.5) * 1) : 25.0;

// Byte Donusumleri (Big Endian)
// - Pompa Durumu: 1 byte (0 veya 1)
var bStatus = pumpActive;

// - Basinc: 10 ile carpilarak 16-bit integer (2 byte)
var bPress = Math.round(pressure * 10);
var bPress1 = (bPress >> 8) & 0xFF;
var bPress0 = bPress & 0xFF;

// - Akis Hizi: 10 ile carpilarak 16-bit integer (2 byte)
var bFlow = Math.round(flowRate * 10);
var bFlow1 = (bFlow >> 8) & 0xFF;
var bFlow0 = bFlow & 0xFF;

// - Tank Seviyesi: 10 ile carpilarak 16-bit integer (2 byte)
var bTank = Math.round(currentTankVal * 10);
var bTank1 = (bTank >> 8) & 0xFF;
var bTank0 = bTank & 0xFF;

// - Motor Sicakligi: 10 ile carpilarak 16-bit integer (2 byte)
var bTemp = Math.round(motorTemp * 10);
var bTemp1 = (bTemp >> 8) & 0xFF;
var bTemp0 = bTemp & 0xFF;

// Toplam 9 byte veri dizisi dondurur
return [bStatus, bPress1, bPress0, bFlow1, bFlow0, bTank1, bTank0, bTemp1, bTemp0];`
		defaultCfg.Payload = "" // Clear static hex since we use payload script
	}

	if err := SaveOrgConfig(tenantID, &defaultCfg); err != nil {
		log.WithError(err).Warnf("bootstrap: failed to save default simulation config for org %s", req.OrgName)
	}

	// 2. Create or Find Device Profiles
	type ResourceDetail struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}

	dpIDs := make([]string, 0, req.DpCount)
	dpDetails := make([]ResourceDetail, 0, req.DpCount)

	// Fetch existing device profiles for this tenant
	var existingProfiles []*api.DeviceProfileListItem
	listDpsResp, err := as.DeviceProfile().List(ctx, &api.ListDeviceProfilesRequest{
		TenantId: tenantID,
		Limit:    100,
	})
	if err == nil {
		existingProfiles = listDpsResp.GetResult()
	} else {
		log.WithError(err).Warn("bootstrap: failed to list device profiles, trying to create instead")
	}

	for i := 1; i <= req.DpCount; i++ {
		dpName := fmt.Sprintf("%s-%s-%d", req.OrgName, req.DpPrefix, i)
		var dpID string

		for _, dp := range existingProfiles {
			if dp.GetName() == dpName {
				dpID = dp.GetId()
				log.Infof("bootstrap: device profile %s already exists (id: %s), reusing it", dpName, dpID)
				break
			}
		}

		if dpID == "" {
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
			dpID = dpResp.GetId()
			log.Infof("bootstrap: created device profile %s (id: %s)", dpName, dpID)
		}

		dpIDs = append(dpIDs, dpID)
		dpDetails = append(dpDetails, ResourceDetail{ID: dpID, Name: dpName})
	}

	// 3. Create Network Applications and Devices
	appDetails := make([]ResourceDetail, 0, req.AppCount)
	createdAppsCount := 0
	createdDevicesCount := 0

	// Fetch existing applications for this tenant
	var existingApps []*api.ApplicationListItem
	listAppsResp, err := as.Application().List(ctx, &api.ListApplicationsRequest{
		TenantId: tenantID,
		Limit:    100,
	})
	if err == nil {
		existingApps = listAppsResp.GetResult()
	} else {
		log.WithError(err).Warn("bootstrap: failed to list applications, trying to create instead")
	}

	for i := 1; i <= req.AppCount; i++ {
		appName := fmt.Sprintf("%s-%s-%d", req.OrgName, req.AppPrefix, i)
		var appID string

		for _, app := range existingApps {
			if app.GetName() == appName {
				appID = app.GetId()
				log.Infof("bootstrap: application %s already exists (id: %s), reusing it", appName, appID)
				break
			}
		}

		if appID == "" {
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
			appID = appResp.GetId()
			log.Infof("bootstrap: created application %s (id: %s)", appName, appID)
		}

		createdAppsCount++
		appDetails = append(appDetails, ResourceDetail{ID: appID, Name: appName})

		// Fetch existing devices for this application to avoid ALREADY_EXISTS error
		var existingDevices []*api.DeviceListItem
		listDevsResp, err := as.Device().List(ctx, &api.ListDevicesRequest{
			ApplicationId: appID,
			Limit:         100,
		})
		if err == nil {
			existingDevices = listDevsResp.GetResult()
		} else {
			log.WithError(err).Warn("bootstrap: failed to list devices, trying to create instead")
		}

		// Create Devices under this application concurrently
		var wg sync.WaitGroup
		var mu sync.Mutex
		sem := make(chan struct{}, 10) // Limit concurrency to 10 gRPC calls
		var errOnce sync.Once
		var bootstrapErr error

		for j := 1; j <= req.DevCount; j++ {
			if bootstrapErr != nil {
				break
			}

			wg.Add(1)
			go func(j int) {
				defer wg.Done()

				sem <- struct{}{}
				defer func() { <-sem }()

				if bootstrapErr != nil {
					return
				}

				devName := fmt.Sprintf("%s-%s-%d", appName, req.DevPrefix, j)

				// Check if device already exists (either by name or dev_eui)
				var devEUIStr string
				var appKeyStr string

				for _, dev := range existingDevices {
					if dev.GetName() == devName {
						devEUIStr = dev.GetDevEui()
						log.Infof("bootstrap: device %s already exists (eui: %s), reusing it", devName, devEUIStr)
						break
					}
				}

				// If it doesn't exist, generate random DevEUI and AppKey
				if devEUIStr == "" {
					var devEUIBytes [8]byte
					if _, err := rand.Read(devEUIBytes[:]); err != nil {
						errOnce.Do(func() {
							bootstrapErr = fmt.Errorf("rastgele DevEUI üretilemedi: %w", err)
						})
						return
					}
					devEUIStr = hex.EncodeToString(devEUIBytes[:])
				}

				var appKeyBytes [16]byte
				if _, err := rand.Read(appKeyBytes[:]); err != nil {
					errOnce.Do(func() {
						bootstrapErr = fmt.Errorf("rastgele AppKey üretilemedi: %w", err)
					})
					return
				}
				appKeyStr = hex.EncodeToString(appKeyBytes[:])

				// Select device profile and interval based on slot index
				dpID := dpIDs[(j-1)%len(dpIDs)]
				interval := "2m"

				for _, dCfg := range req.DevicesConfig {
					if dCfg.DeviceIndex == j {
						if dCfg.ProfileIndex >= 1 && dCfg.ProfileIndex <= len(dpIDs) {
							dpID = dpIDs[dCfg.ProfileIndex-1]
						}
						if dCfg.Interval != "" {
							interval = dCfg.Interval
						}
						break
					}
				}

				// Only Create device if it was not found
				var deviceFound bool
				for _, dev := range existingDevices {
					if dev.GetName() == devName {
						deviceFound = true
						break
					}
				}

				if !deviceFound {
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
						errOnce.Do(func() {
							log.WithError(err).Errorf("bootstrap: failed to create device %s", devName)
							bootstrapErr = fmt.Errorf("cihaz %s oluşturulamadı: %w", devName, err)
						})
						return
					}
					log.Infof("bootstrap: created device %s (eui: %s)", devName, devEUIStr)
				}

				// Always recreate/update keys to ensure we match the newly generated AppKey
				_, _ = as.Device().DeleteKeys(ctx, &api.DeleteDeviceKeysRequest{DevEui: devEUIStr})

				_, err = as.Device().CreateKeys(ctx, &api.CreateDeviceKeysRequest{
					DeviceKeys: &api.DeviceKeys{
						DevEui: devEUIStr,
						NwkKey: appKeyStr,
					},
				})
				if err != nil {
					errOnce.Do(func() {
						log.WithError(err).Errorf("bootstrap: failed to create keys for device %s", devName)
						bootstrapErr = fmt.Errorf("cihaz anahtarları %s oluşturulamadı: %w", devName, err)
					})
					return
				}

				// Save configured interval for this device
				if err := SaveDeviceInterval(devEUIStr, interval); err != nil {
					log.WithError(err).Warnf("bootstrap: failed to save interval for device %s", devName)
				}

				mu.Lock()
				createdDevicesCount++
				mu.Unlock()
			}(j)
		}

		wg.Wait()

		if bootstrapErr != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": bootstrapErr.Error()})
			return
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
