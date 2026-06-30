package simulator

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	mrand "math/rand"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gofrs/uuid"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/brocaar/chirpstack-simulator/internal/ns"
	"github.com/brocaar/chirpstack-simulator/simulator"
	"github.com/brocaar/lorawan"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/chirpstack/chirpstack/api/go/v4/common"
	"github.com/chirpstack/chirpstack/api/go/v4/gw"
)

// Start starts the simulator.
func Start(ctx context.Context, wg *sync.WaitGroup, c config.Config) error {
	for i, c := range c.Simulator {
		// AppName ve DeviceNamePrefix belirtilmemişse varsayılan üret.
		appName := c.AppName
		if appName == "" {
			appName = fmt.Sprintf("uygulama-%d", i+1)
		}
		deviceNamePrefix := c.DeviceNamePrefix
		if deviceNamePrefix == "" {
			deviceNamePrefix = "device"
		}

		log.WithFields(log.Fields{
			"i": i,
		}).Info(fmt.Sprintf("[%s] simulator: starting simulation", appName))

		wg.Add(1)

		pl, err := hex.DecodeString(c.Device.Payload)
		if err != nil {
			return errors.Wrap(err, "decode payload error")
		}

		sim := simulation{
			ctx:                  ctx,
			wg:                   wg,
			tenantID:             c.TenantID,
			deviceCount:          c.Device.Count,
			activationTime:       c.ActivationTime,
			uplinkInterval:       c.Device.UplinkInterval,
			fPort:                c.Device.FPort,
			payload:              pl,
			frequency:            c.Device.Frequency,
			bandwidth:            c.Device.Bandwidth,
			spreadingFactor:      c.Device.SpreadingFactor,
			duration:             c.Duration,
			gatewayMinCount:      c.Gateway.MinCount,
			gatewayMaxCount:      c.Gateway.MaxCount,
			appName:              appName,
			deviceNamePrefix:     deviceNamePrefix,
			deviceIntervals:      c.DeviceIntervals,
			payloadScript:        c.PayloadScript,
			packetLoss:           c.PacketLoss,
			latencyMs:            c.LatencyMs,
			anomalyProbability:   c.AnomalyProbability,
			anomalyTypes:         c.AnomalyTypes,
			anomalyDuration:      c.AnomalyDuration,
			passiveMode:          c.PassiveMode,
			deviceAppKeys:        make(map[lorawan.EUI64]lorawan.AES128Key),
			deviceNames:          make(map[lorawan.EUI64]string),
			deviceEUIs:           []lorawan.EUI64{},
			eventTopicTemplate:   c.Gateway.EventTopicTemplate,
			commandTopicTemplate: c.Gateway.CommandTopicTemplate,
		}

		go sim.start()
	}

	return nil
}

type simulation struct {
	ctx             context.Context
	wg              *sync.WaitGroup
	tenantID        string
	deviceCount     int
	gatewayMinCount int
	gatewayMaxCount int
	duration        time.Duration
	passiveMode     bool

	fPort            uint8
	payload          []byte
	activationTime   time.Duration
	uplinkInterval   time.Duration
	frequency        int
	bandwidth        int
	spreadingFactor  int
	appName          string
	deviceNamePrefix string
	deviceIntervals  map[string]time.Duration
	payloadScript    string
	packetLoss       float64
	latencyMs        int
	anomalyProbability float64
	anomalyTypes       string
	anomalyDuration    int

	tenant               *api.Tenant
	deviceProfileID      uuid.UUID
	applicationID        string
	gatewayIDs           []lorawan.EUI64
	deviceEUIs           []lorawan.EUI64
	deviceAppKeysMutex   sync.Mutex
	deviceAppKeys        map[lorawan.EUI64]lorawan.AES128Key
	deviceNames          map[lorawan.EUI64]string
	eventTopicTemplate   string
	commandTopicTemplate string
}

func (s *simulation) start() {
	if err := s.init(); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: init simulation error", s.appName))
	}

	if err := s.runSimulation(); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: simulation error", s.appName))
	}

	log.Info(fmt.Sprintf("[%s] simulator: simulation completed", s.appName))

	if err := s.tearDown(); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: tear-down simulation error", s.appName))
	}

	s.wg.Done()

	log.Info(fmt.Sprintf("[%s] simulation: tear-down completed", s.appName))
}

func (s *simulation) init() error {
	log.Info(fmt.Sprintf("[%s] simulation: setting up", s.appName))

	if err := s.setupTenant(); err != nil {
		return err
	}

	if err := s.setupGateways(); err != nil {
		return err
	}

	if err := s.setupDeviceProfile(); err != nil {
		return err
	}

	if err := s.setupApplication(); err != nil {
		return err
	}

	if err := s.setupDevices(); err != nil {
		return err
	}

	if err := s.setupApplicationIntegration(); err != nil {
		return err
	}

	return nil
}

func (s *simulation) tearDown() error {
	log.Info(fmt.Sprintf("[%s] simulation: cleaning up", s.appName))

	if err := s.tearDownApplicationIntegration(); err != nil {
		return err
	}

	if err := s.tearDownDevices(); err != nil {
		return err
	}

	if err := s.tearDownApplication(); err != nil {
		return err
	}

	if err := s.tearDownDeviceProfile(); err != nil {
		return err
	}

	if err := s.tearDownGateways(); err != nil {
		return err
	}

	return nil
}

func (s *simulation) runSimulation() error {
	var gateways []*simulator.Gateway
	var devices []*simulator.Device

	for _, gatewayID := range s.gatewayIDs {
		gw, err := simulator.NewGateway(
			simulator.WithGatewayID(gatewayID),
			simulator.WithMQTTClient(ns.Client()),
			simulator.WithEventTopicTemplate(s.eventTopicTemplate),
			simulator.WithCommandTopicTemplate(s.commandTopicTemplate),
			simulator.WithGatewayTenantID(s.tenantID),
		)
		if err != nil {
			return errors.Wrap(err, "new gateway error")
		}
		gateways = append(gateways, gw)
	}

	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(s.ctx)
	if s.duration != 0 {
		ctx, cancel = context.WithTimeout(ctx, s.duration)
	}
	defer cancel()

	for devEUI, appKey := range s.deviceAppKeys {
		devGateways := make(map[int]*simulator.Gateway)
		devNumGateways := s.gatewayMinCount + mrand.Intn(s.gatewayMaxCount-s.gatewayMinCount+1)

		for len(devGateways) < devNumGateways {
			// pick random gateway index
			n := mrand.Intn(len(gateways))
			devGateways[n] = gateways[n]
		}

		var gws []*simulator.Gateway
		for k := range devGateways {
			gws = append(gws, devGateways[k])
		}

		devInterval := s.uplinkInterval
		if s.deviceIntervals != nil {
			if customInterval, ok := s.deviceIntervals[devEUI.String()]; ok {
				devInterval = customInterval
			}
		}

		var anomalyTypes []string
		if s.anomalyTypes != "" {
			for _, t := range strings.Split(s.anomalyTypes, ",") {
				trimmed := strings.TrimSpace(t)
				if trimmed != "" {
					anomalyTypes = append(anomalyTypes, trimmed)
				}
			}
		}

		d, err := simulator.NewDevice(ctx, &wg,
			simulator.WithDevEUI(devEUI),
			simulator.WithAppName(s.appName),
			simulator.WithDeviceName(s.deviceNames[devEUI]),
			simulator.WithAppKey(appKey),
			simulator.WithUplinkInterval(devInterval),
			simulator.WithOTAADelay(time.Duration(mrand.Int63n(int64(s.activationTime)))),
			simulator.WithUplinkPayload(false, s.fPort, s.payload),
			simulator.WithPayloadScript(s.payloadScript),
			simulator.WithPacketLoss(s.packetLoss),
			simulator.WithLatencyMs(s.latencyMs),
			simulator.WithAnomalyProbability(s.anomalyProbability),
			simulator.WithAnomalyTypes(anomalyTypes),
			simulator.WithAnomalyDuration(s.anomalyDuration),
			simulator.WithGateways(gws),
			simulator.WithDeviceTenantID(s.tenantID),
			simulator.WithDeviceApplicationID(s.applicationID),
			simulator.WithUplinkTXInfo(gw.UplinkTxInfo{
				Frequency: uint32(s.frequency),
				Modulation: &gw.Modulation{
					Parameters: &gw.Modulation_Lora{
						Lora: &gw.LoraModulationInfo{
							Bandwidth:       uint32(s.bandwidth),
							SpreadingFactor: uint32(s.spreadingFactor),
							CodeRate:        gw.CodeRate_CR_4_5,
						},
					},
				},
			}),
		)
		if err != nil {
			return errors.Wrap(err, "new device error")
		}

		devices = append(devices, d)
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

		select {
		case sig := <-sigChan:
			log.WithField("signal", sig).Info(fmt.Sprintf("[%s] signal received, stopping simulators", s.appName))
			cancel()
		case <-ctx.Done():
		}
	}()

	wg.Wait()

	return nil
}

func (s *simulation) setupTenant() error {
	log.WithFields(log.Fields{
		"tenant_id": s.tenantID,
	}).Info(fmt.Sprintf("[%s] simulator: retrieving tenant", s.appName))
	t, err := as.Tenant().Get(context.Background(), &api.GetTenantRequest{
		Id: s.tenantID,
	})
	if err != nil {
		return errors.Wrap(err, "get tenant error")
	}
	s.tenant = t.GetTenant()

	return nil
}

func (s *simulation) setupGateways() error {
	if s.passiveMode {
		log.Info(fmt.Sprintf("[%s] simulator: passive mode — reading existing gateways from ChirpStack", s.appName))
		resp, err := as.Gateway().List(context.Background(), &api.ListGatewaysRequest{
			TenantId: s.tenant.GetId(),
			Limit:    1000,
		})
		if err != nil {
			return errors.Wrap(err, "passive: list gateways error")
		}
		for _, g := range resp.GetResult() {
			var eui lorawan.EUI64
			if err := eui.UnmarshalText([]byte(g.GetGatewayId())); err != nil {
				log.WithError(err).Warnf("[%s] passive: parse gateway EUI %s", s.appName, g.GetGatewayId())
				continue
			}
			s.gatewayIDs = append(s.gatewayIDs, eui)
		}
		if len(s.gatewayIDs) == 0 {
			return errors.New("passive mode: no gateways found in ChirpStack for this tenant")
		}
		log.Infof("[%s] simulator: passive mode — %d gateways loaded", s.appName, len(s.gatewayIDs))
		return nil
	}

	log.Info(fmt.Sprintf("[%s] simulator: creating gateways", s.appName))
	for i := 0; i < s.gatewayMaxCount; i++ {
		var gatewayID lorawan.EUI64
		if _, err := rand.Read(gatewayID[:]); err != nil {
			return errors.Wrap(err, "read random bytes error")
		}

		_, err := as.Gateway().Create(context.Background(), &api.CreateGatewayRequest{
			Gateway: &api.Gateway{
				GatewayId:   gatewayID.String(),
				Name:        gatewayID.String(),
				Description: gatewayID.String(),
				TenantId:    s.tenant.GetId(),
				Location:    &common.Location{},
			},
		})
		if err != nil {
			return errors.Wrap(err, "create gateway error")
		}

		s.gatewayIDs = append(s.gatewayIDs, gatewayID)
	}
	return nil
}

func (s *simulation) tearDownGateways() error {
	if s.passiveMode {
		log.Info(fmt.Sprintf("[%s] simulator: passive mode — skipping gateway teardown", s.appName))
		return nil
	}

	log.Info(fmt.Sprintf("[%s] simulator: tear-down gateways", s.appName))
	for _, gatewayID := range s.gatewayIDs {
		_, err := as.Gateway().Delete(context.Background(), &api.DeleteGatewayRequest{
			GatewayId: gatewayID.String(),
		})
		if err != nil {
			return errors.Wrap(err, "delete gateway error")
		}
	}
	return nil
}

func (s *simulation) setupDeviceProfile() error {
	log.Info(fmt.Sprintf("[%s] simulator: init device-profile (upsert)", s.appName))

	dpName := fmt.Sprintf("%s-profile", s.appName)

	// List device profiles to check if it already exists
	listResp, err := as.DeviceProfile().List(context.Background(), &api.ListDeviceProfilesRequest{
		Limit:    100,
		TenantId: s.tenant.GetId(),
	})
	if err != nil {
		return errors.Wrap(err, "list device-profiles error")
	}

	// In passive mode: use first matching profile (by name), else any profile
	if s.passiveMode {
		profiles := listResp.GetResult()
		if len(profiles) == 0 {
			return errors.New("passive mode: no device profiles found in ChirpStack for this tenant")
		}
		// Prefer a profile whose name matches our convention, fall back to first
		for _, item := range profiles {
			if item.GetName() == dpName {
				dpID, err := uuid.FromString(item.GetId())
				if err != nil {
					return err
				}
				s.deviceProfileID = dpID
				log.Infof("[%s] passive: matched device-profile '%s'", s.appName, dpName)
				return nil
			}
		}
		// Fall back to first available
		dpID, err := uuid.FromString(profiles[0].GetId())
		if err != nil {
			return err
		}
		s.deviceProfileID = dpID
		log.Infof("[%s] passive: using first available device-profile '%s'", s.appName, profiles[0].GetName())
		return nil
	}

	for _, item := range listResp.GetResult() {
		if item.GetName() == dpName {
			dpID, err := uuid.FromString(item.GetId())
			if err != nil {
				return err
			}
			s.deviceProfileID = dpID
			log.WithFields(log.Fields{
				"name": dpName,
				"id":   s.deviceProfileID.String(),
			}).Info(fmt.Sprintf("[%s] simulator: mevcut device-profile bulundu, yeniden kullanılıyor", s.appName))
			return nil
		}
	}

	// Create new one if it doesn't exist
	resp, err := as.DeviceProfile().Create(context.Background(), &api.CreateDeviceProfileRequest{
		DeviceProfile: &api.DeviceProfile{
			Name:              dpName,
			TenantId:          s.tenant.GetId(),
			MacVersion:        common.MacVersion_LORAWAN_1_0_3,
			RegParamsRevision: common.RegParamsRevision_B,
			SupportsOtaa:      true,
			Region:            common.Region_EU868,
			AdrAlgorithmId:    "default",
		},
	})
	if err != nil {
		return errors.Wrap(err, "create device-profile error")
	}

	dpID, err := uuid.FromString(resp.Id)
	if err != nil {
		return err
	}
	s.deviceProfileID = dpID

	log.WithFields(log.Fields{
		"name": dpName,
		"id":   s.deviceProfileID.String(),
	}).Info(fmt.Sprintf("[%s] simulator: yeni device-profile oluşturuldu", s.appName))

	return nil
}

func (s *simulation) tearDownDeviceProfile() error {
	// Cihaz profili kalıcıdır: yeniden başlatmada aynı profil kullanılır.
	// Silme işlemi yapılmıyor.
	log.WithField("app_name", s.appName).Info(fmt.Sprintf("[%s] simulator: device-profile korunuyor (silinmiyor)", s.appName))
	return nil
}

func (s *simulation) setupApplication() error {
	log.WithField("app_name", s.appName).Info(fmt.Sprintf("[%s] simulator: init application (upsert)", s.appName))

	// Mevcut uygulamayı isimle ara.
	listResp, err := as.Application().List(context.Background(), &api.ListApplicationsRequest{
		TenantId: s.tenant.GetId(),
		Limit:    100,
		Search:   s.appName,
	})
	if err != nil {
		return errors.Wrap(err, "list applications error")
	}

	// Passive mode: use first available application in the tenant
	if s.passiveMode {
		for _, item := range listResp.GetResult() {
			if item.GetName() == s.appName {
				s.applicationID = item.GetId()
				log.Infof("[%s] passive: matched application '%s'", s.appName, s.appName)
				return nil
			}
		}
		// Fall back: list all apps without search filter
		allApps, err := as.Application().List(context.Background(), &api.ListApplicationsRequest{
			TenantId: s.tenant.GetId(),
			Limit:    100,
		})
		if err != nil {
			return errors.Wrap(err, "passive: list all applications error")
		}
		results := allApps.GetResult()
		if len(results) == 0 {
			return errors.New("passive mode: no applications found in ChirpStack for this tenant")
		}
		s.applicationID = results[0].GetId()
		log.Infof("[%s] passive: using first available application '%s'", s.appName, results[0].GetName())
		return nil
	}

	for _, item := range listResp.GetResult() {
		if item.GetName() == s.appName {
			s.applicationID = item.GetId()
			log.WithFields(log.Fields{
				"app_name": s.appName,
				"app_id":   s.applicationID,
			}).Info(fmt.Sprintf("[%s] simulator: mevcut uygulama bulundu, yeniden kullanılıyor", s.appName))
			return nil
		}
	}

	// Yoksa oluştur.
	createAppResp, err := as.Application().Create(context.Background(), &api.CreateApplicationRequest{
		Application: &api.Application{
			Name:        s.appName,
			Description: s.appName,
			TenantId:    s.tenant.GetId(),
		},
	})
	if err != nil {
		return errors.Wrap(err, "create application error")
	}

	s.applicationID = createAppResp.Id
	log.WithFields(log.Fields{
		"app_name": s.appName,
		"app_id":   s.applicationID,
	}).Info(fmt.Sprintf("[%s] simulator: yeni uygulama oluşturuldu", s.appName))
	return nil
}

func (s *simulation) tearDownApplication() error {
	// Uygulama ve device'lar kalıcıdır: yeniden başlatmada aynı ID kullanılır.
	// Silme işlemi yapılmıyor.
	log.WithField("app_name", s.appName).Info(fmt.Sprintf("[%s] simulator: uygulama korunuyor (silinmiyor)", s.appName))
	return nil
}

func (s *simulation) setupDevices() error {
	log.Info(fmt.Sprintf("[%s] simulator: init devices (loading existing devices)", s.appName))

	// 1. ChirpStack'te bu uygulamaya kayıtlı TÜM cihazları çekelim.
	var allDevices []*api.DeviceListItem
	var offset uint32 = 0
	for {
		listResp, err := as.Device().List(context.Background(), &api.ListDevicesRequest{
			ApplicationId: s.applicationID,
			Limit:         1000,
			Offset:        offset,
		})
		if err != nil {
			return errors.Wrap(err, "list devices error")
		}

		results := listResp.GetResult()
		if len(results) == 0 {
			break
		}

		allDevices = append(allDevices, results...)

		if len(results) < 1000 {
			break
		}
		offset += 1000
	}

	// 2. s.deviceAppKeys, s.deviceNames ve s.deviceEUIs listelerini sadece aktif (is_disabled=false) olanlarla dolduralım.
	s.deviceAppKeysMutex.Lock()
	defer s.deviceAppKeysMutex.Unlock()

	s.deviceAppKeys = make(map[lorawan.EUI64]lorawan.AES128Key)
	s.deviceNames = make(map[lorawan.EUI64]string)
	s.deviceEUIs = []lorawan.EUI64{}

	for _, devItem := range allDevices {
		var devEUI lorawan.EUI64
		if err := devEUI.UnmarshalText([]byte(devItem.GetDevEui())); err != nil {
			return errors.Wrapf(err, "parse dev EUI for %s", devItem.GetName())
		}

		// Cihazın detaylarını çekip IsDisabled durumunu kontrol edelim.
		devResp, err := as.Device().Get(context.Background(), &api.GetDeviceRequest{
			DevEui: devItem.GetDevEui(),
		})
		if err != nil {
			log.WithError(err).Warnf("[%s] get device %s error, skipping", s.appName, devItem.GetName())
			continue
		}

		if devResp.GetDevice().GetIsDisabled() {
			log.Infof("[%s] device %s is disabled in ChirpStack, skipping from simulation", s.appName, devItem.GetName())
			continue
		}

		// Cihazın anahtarlarını çekelim.
		keysResp, err := as.Device().GetKeys(context.Background(), &api.GetDeviceKeysRequest{
			DevEui: devItem.GetDevEui(),
		})
		if err != nil {
			log.WithError(err).Warnf("[%s] get device keys for %s error, skipping", s.appName, devItem.GetName())
			continue
		}
		var appKey lorawan.AES128Key
		if err := appKey.UnmarshalText([]byte(keysResp.GetDeviceKeys().GetNwkKey())); err != nil {
			log.WithError(err).Warnf("[%s] parse app key for %s error, skipping", s.appName, devItem.GetName())
			continue
		}

		s.deviceAppKeys[devEUI] = appKey
		s.deviceNames[devEUI] = devItem.GetName()
		s.deviceEUIs = append(s.deviceEUIs, devEUI)
	}

	return nil
}

func (s *simulation) tearDownDevices() error {
	// Device'lar kalıcıdır: yeniden başlatmada aynı EUI ve anahtarlar kullanılır.
	// Silme işlemi yapılmıyor.
	log.Info(fmt.Sprintf("[%s] simulator: device'lar korunuyor (silinmiyor)", s.appName))
	return nil
}

func (s *simulation) setupApplicationIntegration() error {
	log.Info(fmt.Sprintf("[%s] simulator: setting up application integration", s.appName))

	token := as.MQTTClient().Subscribe(fmt.Sprintf("application/%s/device/+/event/up", s.applicationID), 0, func(client mqtt.Client, msg mqtt.Message) {
		applicationUplinkCounter().Inc()
	})
	token.Wait()
	if token.Error() != nil {
		return errors.Wrap(token.Error(), "subscribe application integration error")
	}

	return nil
}

func (s *simulation) tearDownApplicationIntegration() error {
	log.Info(fmt.Sprintf("[%s] simulator: tear-down application integration", s.appName))

	token := as.MQTTClient().Unsubscribe(fmt.Sprintf("application/%s/device/+/event/up", s.applicationID))
	token.Wait()
	if token.Error() != nil {
		return errors.Wrap(token.Error(), "unsubscribe application integration error")
	}

	return nil
}
