package simulator

import (
	"context"
	crand "crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	mrand "math/rand"
	"strings"
	"sync"
	"time"

	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"

	"github.com/brocaar/lorawan"
	"github.com/chirpstack/chirpstack/api/go/v4/gw"
	goja "github.com/dop251/goja"
)

// DeviceOption is the interface for a device option.
type DeviceOption func(*Device) error

type deviceState int

const (
	deviceStateOTAA deviceState = iota
	deviceStateActivated
)

// Device contains the state of a simulated LoRaWAN OTAA device (1.0.x).
type Device struct {
	sync.RWMutex

	// Context to cancel device.
	ctx context.Context

	// Cancel function.
	cancel context.CancelFunc

	// Waitgroup to wait until simulation has been fully cancelled.
	wg *sync.WaitGroup

	// DevEUI.
	devEUI lorawan.EUI64

	// AppName.
	appName string

	// DeviceName.
	deviceName string

	// DeviceProfileName.
	deviceProfileName string

	// JoinEUI.
	joinEUI lorawan.EUI64

	// AppKey.
	appKey lorawan.AES128Key

	// Interval in which device sends uplinks.
	uplinkInterval time.Duration

	// Total number of uplinks to send, before terminating.
	uplinkCount uint32

	// Device sends uplink as confirmed.
	confirmed bool

	// Payload (plaintext) which the device sends as uplink.
	payload []byte

	// FPort used for sending uplinks.
	fPort uint8

	// Assigned device address.
	devAddr lorawan.DevAddr

	// DevNonce.
	devNonce lorawan.DevNonce

	// Uplink frame-counter.
	fCntUp uint32

	// Downlink frame-counter.
	fCntDown uint32

	// Application session-key.
	appSKey lorawan.AES128Key

	// Network session-key.
	nwkSKey lorawan.AES128Key

	// Activation state.
	state deviceState

	// Downlink frames channel (used by the gateway). Note that the gateway
	// forwards downlink frames to all associated devices, as only the device
	// is able to validate the addressee.
	downlinkFrames chan gw.DownlinkFrame

	// The associated gateway through which the device simulates its uplinks.
	gateways []*Gateway

	// Random DevNonce
	randomDevNonce bool

	// TXInfo for uplink
	uplinkTXInfo gw.UplinkTxInfo

	// Downlink handler function.
	downlinkHandlerFunc func(confirmed, ack bool, fCntDown uint32, fPort uint8, data []byte) error

	// OTAA delay.
	otaaDelay time.Duration

	// Payload JS Script.
	payloadScript string

	// Packet loss percentage.
	packetLoss float64

	// Transmission delay.
	latencyMs int

	// Tenant ID.
	tenantID string

	// Application ID.
	applicationID string

	// Anomaly parameters
	anomalyProbability     float64
	anomalyTypes           []string
	anomalyDuration        int
	activeAnomalyType      string
	activeAnomalyRemaining int
	driftAccumulated       float64
	lastPayload            []byte
	manualAnomalyType      string
	manualAnomalyActive    bool

	// Codec Auto-Probe & Generator state
	matchedCodecFamily string
	probedOnce         bool
}

// WithAppKey sets the AppKey.
func WithAppKey(appKey lorawan.AES128Key) DeviceOption {
	return func(d *Device) error {
		d.appKey = appKey
		return nil
	}
}

// WithAppName sets the AppName.
func WithAppName(appName string) DeviceOption {
	return func(d *Device) error {
		d.appName = appName
		return nil
	}
}

// WithDeviceName sets the DeviceName.
func WithDeviceName(deviceName string) DeviceOption {
	return func(d *Device) error {
		d.deviceName = deviceName
		return nil
	}
}

// WithDeviceProfileName sets the DeviceProfileName.
func WithDeviceProfileName(name string) DeviceOption {
	return func(d *Device) error {
		d.deviceProfileName = name
		return nil
	}
}

// WithDevEUI sets the DevEUI.
func WithDevEUI(devEUI lorawan.EUI64) DeviceOption {
	return func(d *Device) error {
		d.devEUI = devEUI
		return nil
	}
}

// WithJoinEUI sets the JoinEUI.
func WithJoinEUI(joinEUI lorawan.EUI64) DeviceOption {
	return func(d *Device) error {
		d.joinEUI = joinEUI
		return nil
	}
}

// WithOTAADelay sets the OTAA delay.
func WithOTAADelay(delay time.Duration) DeviceOption {
	return func(d *Device) error {
		d.otaaDelay = delay
		return nil
	}
}

// WithUplinkInterval sets the uplink interval.
func WithUplinkInterval(interval time.Duration) DeviceOption {
	return func(d *Device) error {
		d.uplinkInterval = interval
		return nil
	}
}

// WithUplinkCount sets the uplink count, after which the device simulation
// ends.
func WithUplinkCount(count uint32) DeviceOption {
	return func(d *Device) error {
		d.uplinkCount = count
		return nil
	}
}

// WithUplinkPayload sets the uplink payload.
func WithUplinkPayload(confirmed bool, fPort uint8, pl []byte) DeviceOption {
	return func(d *Device) error {
		d.fPort = fPort
		d.payload = make([]byte, len(pl))
		copy(d.payload, pl)
		d.confirmed = confirmed
		return nil
	}
}

// WithGateways adds the device to the given gateways.
// Use this function after WithDevEUI, WithAppName, WithDeviceName!
func WithGateways(gws []*Gateway) DeviceOption {
	return func(d *Device) error {
		d.gateways = gws

		for i := range d.gateways {
			d.gateways[i].addDevice(d.devEUI, d.appName, d.deviceName, d.downlinkFrames)
		}
		return nil
	}
}

// WithRandomDevNonce randomizes the OTAA DevNonce instead of using a counter value.
func WithRandomDevNonce() DeviceOption {
	return func(d *Device) error {
		d.randomDevNonce = true
		return nil
	}
}

// WithUplinkTXInfo sets the TXInfo used for simulating the uplinks.
func WithUplinkTXInfo(txInfo gw.UplinkTxInfo) DeviceOption {
	return func(d *Device) error {
		d.uplinkTXInfo = txInfo
		return nil
	}
}

// WithDownlinkHandlerFunc sets the downlink handler func.
func WithDownlinkHandlerFunc(f func(confirmed, ack bool, fCntDown uint32, fPort uint8, data []byte) error) DeviceOption {
	return func(d *Device) error {
		d.downlinkHandlerFunc = f
		return nil
	}
}

// WithPayloadScript sets the custom payload script.
func WithPayloadScript(script string) DeviceOption {
	return func(d *Device) error {
		d.payloadScript = script
		return nil
	}
}

// WithPacketLoss sets the packet loss percentage.
func WithPacketLoss(loss float64) DeviceOption {
	return func(d *Device) error {
		d.packetLoss = loss
		return nil
	}
}

// WithLatencyMs sets the transmission delay.
func WithLatencyMs(ms int) DeviceOption {
	return func(d *Device) error {
		d.latencyMs = ms
		return nil
	}
}

// WithDeviceTenantID sets the tenant ID.
func WithDeviceTenantID(tenantID string) DeviceOption {
	return func(d *Device) error {
		d.tenantID = tenantID
		return nil
	}
}

// WithDeviceApplicationID sets the application ID.
func WithDeviceApplicationID(applicationID string) DeviceOption {
	return func(d *Device) error {
		d.applicationID = applicationID
		return nil
	}
}

// WithAnomalyProbability sets the probabilistic anomaly chance.
func WithAnomalyProbability(prob float64) DeviceOption {
	return func(d *Device) error {
		d.anomalyProbability = prob
		return nil
	}
}

// WithAnomalyTypes sets the anomaly types list.
func WithAnomalyTypes(types []string) DeviceOption {
	return func(d *Device) error {
		d.anomalyTypes = types
		return nil
	}
}

// WithAnomalyDuration sets the anomaly duration.
func WithAnomalyDuration(duration int) DeviceOption {
	return func(d *Device) error {
		d.anomalyDuration = duration
		return nil
	}
}

// SetManualAnomaly sets or clears manual anomaly config on the device.
func (d *Device) SetManualAnomaly(anomalyType string, active bool) {
	d.manualAnomalyType = anomalyType
	d.manualAnomalyActive = active
	if !active {
		d.driftAccumulated = 0
	}
}

// NewDevice creates a new device simulation.
func NewDevice(ctx context.Context, wg *sync.WaitGroup, opts ...DeviceOption) (*Device, error) {
	ctx, cancel := context.WithCancel(ctx)

	d := &Device{
		ctx:    ctx,
		cancel: cancel,
		wg:     wg,

		downlinkFrames: make(chan gw.DownlinkFrame, 100),
		state:          deviceStateOTAA,
	}

	for _, o := range opts {
		if err := o(d); err != nil {
			return nil, err
		}
	}

	// log.WithFields(log.Fields{
	// 	"dev_eui":     d.devEUI,
	// 	"app_name":    d.appName,
	// 	"device_name": d.deviceName,
	// }).Info(fmt.Sprintf("[%s] simulator: new otaa device", d.appName))

	ActiveDevices.Register(d)

	wg.Add(2)

	go d.uplinkLoop()
	go d.downlinkLoop()

	return d, nil
}

// uplinkLoop first handle the OTAA activation, after which it will periodically
// sends an uplink with the configured payload and fport.
func (d *Device) uplinkLoop() {
	defer d.cancel()
	defer d.wg.Done()
	defer ActiveDevices.Unregister(d.devEUI)

	if d.otaaDelay > 0 {
		select {
		case <-d.ctx.Done():
			return
		case <-time.After(d.otaaDelay):
		}
	}

	for {
		select {
		case <-d.ctx.Done():
			return
		default:
		}

		switch d.getState() {
		case deviceStateOTAA:
			d.joinRequest()
			select {
			case <-d.ctx.Done():
				return
			case <-time.After(6 * time.Second):
			}
		case deviceStateActivated:
			d.dataUp()

			if d.uplinkCount != 0 {
				if d.fCntUp >= d.uplinkCount {
					// d.cancel() also cancels the downlink loop. Wait one
					// second in order to process any potential downlink
					// response (e.g. and ack).
					select {
					case <-d.ctx.Done():
						return
					case <-time.After(time.Second):
					}
					d.cancel()
					return
				}
			}

			// If uplinkInterval >= 3m (180s), use 0..60s random jitter so intervals vary randomly between 3 and 4 minutes (180s-240s)
			jitterMax := int64(5 * time.Second)
			if d.uplinkInterval >= 3*time.Minute {
				jitterMax = int64(60 * time.Second)
			}
			jitter := time.Duration(mrand.Int63n(jitterMax + 1))
			nextInterval := d.uplinkInterval + jitter

			select {
			case <-d.ctx.Done():
				return
			case <-time.After(nextInterval):
			}
		}
	}
}

// downlinkLoop handles the downlink messages.
// Note: as a gateway does not know the addressee of the downlink, it is up to
// the handling functions to validate the MIC etc..
func (d *Device) downlinkLoop() {
	defer d.cancel()
	defer d.wg.Done()

	for {
		select {
		case <-d.ctx.Done():
			return

		case pl := <-d.downlinkFrames:
			for _, item := range pl.Items {
				err := func() error {
					var phy lorawan.PHYPayload

					if err := phy.UnmarshalBinary(item.PhyPayload); err != nil {
						return errors.Wrap(err, "unmarshal phypayload error")
					}

					switch phy.MHDR.MType {
					case lorawan.JoinAccept:
						return d.joinAccept(phy)
					case lorawan.UnconfirmedDataDown, lorawan.ConfirmedDataDown:
						return d.downlinkData(phy)
					}

					return nil
				}()

				if err != nil {
					log.WithError(err).Error(fmt.Sprintf("[%s] simulator: handle downlink frame error", d.appName))
				}

				break
			}
		}
	}
}

// joinRequest sends the join-request.
func (d *Device) joinRequest() {
	// log.WithFields(log.Fields{
	// 	"dev_eui":     d.devEUI,
	// 	"app_name":    d.appName,
	// 	"device_name": d.deviceName,
	// }).Debug(fmt.Sprintf("[%s] simulator: send OTAA request", d.appName))

	phy := lorawan.PHYPayload{
		MHDR: lorawan.MHDR{
			MType: lorawan.JoinRequest,
			Major: lorawan.LoRaWANR1,
		},
		MACPayload: &lorawan.JoinRequestPayload{
			DevEUI:   d.devEUI,
			JoinEUI:  d.joinEUI,
			DevNonce: d.getDevNonce(),
		},
	}

	if err := phy.SetUplinkJoinMIC(d.appKey); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: set uplink join mic error", d.appName))
		return
	}

	d.sendUplink(phy)

	DeviceJoinRequestCounter(d.tenantID).Inc()
}

// dataUp sends an data uplink.
func (d *Device) dataUp() {
	// 1. Determine active anomaly (either manual or probabilistic)
	d.Lock()
	var currentAnomalyType string
	var isManual bool

	if d.manualAnomalyActive {
		currentAnomalyType = d.manualAnomalyType
		isManual = true
	} else if d.activeAnomalyType != "" {
		currentAnomalyType = d.activeAnomalyType
	} else {
		// Roll for probabilistic anomaly
		if d.anomalyProbability > 0 && len(d.anomalyTypes) > 0 && mrand.Float64() < d.anomalyProbability {
			// pick random type
			n := mrand.Intn(len(d.anomalyTypes))
			d.activeAnomalyType = d.anomalyTypes[n]
			d.activeAnomalyRemaining = d.anomalyDuration
			if d.activeAnomalyRemaining <= 0 {
				d.activeAnomalyRemaining = 5 // default duration
			}
			d.driftAccumulated = 0
			currentAnomalyType = d.activeAnomalyType
		}
	}
	d.Unlock()

	if currentAnomalyType != "" {
		// log.WithFields(log.Fields{
		// 	"dev_eui":      d.devEUI,
		// 	"device_name":  d.deviceName,
		// 	"anomaly_type": currentAnomalyType,
		// 	"is_manual":    isManual,
		// }).Warn(fmt.Sprintf("[%s] simulator: injecting anomaly", d.appName))

		if currentAnomalyType == "dropout" {
			// Veri Kaybı: Skip uplink transmission completely, increment fCnt
			d.Lock()
			d.fCntUp++
			if isManual {
				// one-shot manual anomalies clear immediately
				d.manualAnomalyActive = false
				d.manualAnomalyType = ""
			} else {
				d.activeAnomalyRemaining--
				if d.activeAnomalyRemaining <= 0 {
					d.activeAnomalyType = ""
				}
			}
			d.Unlock()
			
			// Increment metric to show it attempted sending
			DeviceUplinkCounter(d.tenantID).Inc()
			return
		}
	}

	// 2. Build payload (respecting flatline)
	isFlatlineApplied := false
	d.Lock()
	if currentAnomalyType == "flatline" && len(d.lastPayload) > 0 {
		d.payload = make([]byte, len(d.lastPayload))
		copy(d.payload, d.lastPayload)
		isFlatlineApplied = true
	}
	d.Unlock()

	if isFlatlineApplied {
		// log.WithFields(log.Fields{
		// 	"dev_eui":     d.devEUI,
		// 	"app_name":    d.appName,
		// 	"device_name": d.deviceName,
		// 	"payload":     hex.EncodeToString(d.payload),
		// }).Info(fmt.Sprintf("[%s] simulator: flatline anomaly applied, repeated last payload", d.appName))
	} else {
		var genPayload []byte

		if d.payloadScript != "" {
			_ = func() error {
				vm := goja.New()

				anomalyMap := map[string]interface{}{
					"active":     false,
					"type":       "",
					"driftValue": 0.0,
				}
				if currentAnomalyType == "spike" || currentAnomalyType == "drift" {
					d.RLock()
					anomalyMap["active"] = true
					anomalyMap["type"] = currentAnomalyType
					anomalyMap["driftValue"] = d.driftAccumulated
					d.RUnlock()
				}

				_ = vm.Set("fPort", d.fPort)
				_ = vm.Set("fCnt", d.fCntUp)
				_ = vm.Set("devEUI", d.devEUI.String())
				_ = vm.Set("deviceName", d.deviceName)
				_ = vm.Set("deviceProfileName", d.deviceProfileName)
				_ = vm.Set("anomaly", anomalyMap)

				timeLimit := 2 * time.Second
				timer := time.AfterFunc(timeLimit, func() {
					vm.Interrupt("timeout")
				})
				defer timer.Stop()

				// Execute script
				_, runErr := vm.RunString(d.payloadScript)
				if runErr != nil {
					return runErr
				}

				// 1. If simulateUplink(ctx) function exists, call it directly!
				simVal := vm.Get("simulateUplink")
				if simVal != nil && !goja.IsUndefined(simVal) && !goja.IsNull(simVal) {
					if simFn, ok := goja.AssertFunction(simVal); ok {
						ctxObj := vm.NewObject()
						_ = ctxObj.Set("fPort", d.fPort)
						_ = ctxObj.Set("fCnt", d.fCntUp)
						_ = ctxObj.Set("devEUI", d.devEUI.String())
						_ = ctxObj.Set("anomaly", anomalyMap)
						res, err := simFn(goja.Undefined(), ctxObj)
						if err == nil && res != nil && !goja.IsUndefined(res) && !goja.IsNull(res) {
							switch v := res.Export().(type) {
							case []interface{}:
								pl := make([]byte, len(v))
								for i, x := range v {
									if n, ok := x.(int64); ok {
										pl[i] = byte(n)
									} else if f, ok := x.(float64); ok {
										pl[i] = byte(f)
									} else if in, ok := x.(int); ok {
										pl[i] = byte(in)
									}
								}
								genPayload = pl
								return nil
							case string:
								b, hexErr := hex.DecodeString(v)
								if hexErr == nil {
									genPayload = b
									return nil
								}
							}
						}
					}
				}

				// 2. Auto-Probe against decodeUplink()
				if !d.probedOnce {
					d.matchedCodecFamily = d.probeCodecFamily(vm)
					d.probedOnce = true
					log.WithFields(log.Fields{
						"dev_eui": d.devEUI,
						"device":  d.deviceName,
						"family":  d.matchedCodecFamily,
					}).Info(fmt.Sprintf("[%s] simulator: auto-probed codec family", d.appName))
				}

				if d.matchedCodecFamily != "" {
					genPayload = d.generateFamilyPayload(d.matchedCodecFamily, currentAnomalyType)
				}
				return nil
			}()
		}

		if len(genPayload) == 0 {
			if !d.probedOnce || d.matchedCodecFamily == "" {
				profKey := strings.ToUpper(d.deviceProfileName + " " + d.deviceName)
				switch {
				case strings.Contains(profKey, "LHT65") || strings.Contains(profKey, "DRAGINO"):
					d.matchedCodecFamily = "DRAGINO"
				case strings.Contains(profKey, "EM300") || strings.Contains(profKey, "MILESIGHT"):
					d.matchedCodecFamily = "MILESIGHT"
				case strings.Contains(profKey, "AGRO"):
					d.matchedCodecFamily = "AGROSENSE"
				case strings.Contains(profKey, "SMC30") || strings.Contains(profKey, "SENZEMO"):
					d.matchedCodecFamily = "SENZEMO"
				case strings.Contains(profKey, "BROWAN") || strings.Contains(profKey, "TBHV"):
					d.matchedCodecFamily = "CAYENNE"
				case strings.Contains(profKey, "ENGINKO") || strings.Contains(profKey, "MCF"):
					d.matchedCodecFamily = "ENGINKO"
				default:
					d.matchedCodecFamily = "FALLBACK_4B"
				}
				d.probedOnce = true
			}
			genPayload = d.generateFamilyPayload(d.matchedCodecFamily, currentAnomalyType)
		}

		d.Lock()
		d.payload = genPayload
		d.Unlock()

		log.WithFields(log.Fields{
			"dev_eui":     d.devEUI,
			"app_name":    d.appName,
			"device_name": d.deviceName,
			"family":      d.matchedCodecFamily,
			"payload_hex": hex.EncodeToString(genPayload),
		}).Info(fmt.Sprintf("[%s] simulator: generated codec-aware telemetry payload", d.appName))
	}

	log.WithFields(log.Fields{
		"dev_eui":     d.devEUI,
		"dev_addr":    d.devAddr,
		"app_name":    d.appName,
		"device_name": d.deviceName,
		"confirmed":   d.confirmed,
	}).Debug(fmt.Sprintf("[%s] simulator: send uplink data", d.appName))

	mType := lorawan.UnconfirmedDataUp
	if d.confirmed {
		mType = lorawan.ConfirmedDataUp
	}

	d.RLock()
	payloadBytes := make([]byte, len(d.payload))
	copy(payloadBytes, d.payload)
	d.RUnlock()

	phy := lorawan.PHYPayload{
		MHDR: lorawan.MHDR{
			MType: mType,
			Major: lorawan.LoRaWANR1,
		},
		MACPayload: &lorawan.MACPayload{
			FHDR: lorawan.FHDR{
				DevAddr: d.devAddr,
				FCnt:    d.fCntUp,
				FCtrl: lorawan.FCtrl{
					ADR: false,
				},
			},
			FPort: &d.fPort,
			FRMPayload: []lorawan.Payload{
				&lorawan.DataPayload{
					Bytes: payloadBytes,
				},
			},
		},
	}

	if err := phy.EncryptFRMPayload(d.appSKey); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: encrypt FRMPayload error", d.appName))
		return
	}

	if err := phy.SetUplinkDataMIC(lorawan.LoRaWAN1_0, 0, 0, 0, d.nwkSKey, d.nwkSKey); err != nil {
		log.WithError(err).Error(fmt.Sprintf("[%s] simulator: set uplink data mic error", d.appName))
		return
	}

	// 3. Clean up/Update anomaly state & Frame counters
	d.Lock()
	d.fCntUp++

	// Keep copy of last payload
	d.lastPayload = make([]byte, len(d.payload))
	copy(d.lastPayload, d.payload)

	if currentAnomalyType != "" {
		if isManual {
			// One-shot manual anomalies clear immediately
			if currentAnomalyType == "spike" || currentAnomalyType == "dropout" {
				d.manualAnomalyActive = false
				d.manualAnomalyType = ""
			} else if currentAnomalyType == "drift" {
				d.driftAccumulated += 0.5
			}
		} else {
			// Probabilistic anomalies decrement duration
			if currentAnomalyType == "drift" {
				d.driftAccumulated += 0.5
			}
			d.activeAnomalyRemaining--
			if d.activeAnomalyRemaining <= 0 {
				d.activeAnomalyType = ""
				d.driftAccumulated = 0
			}
		}
	}
	d.Unlock()

	d.sendUplink(phy)

	DeviceUplinkCounter(d.tenantID).Inc()
}

// joinAccept validates and handles the join-accept downlink.
func (d *Device) joinAccept(phy lorawan.PHYPayload) error {
	err := phy.DecryptJoinAcceptPayload(d.appKey)
	if err != nil {
		return errors.Wrap(err, "decrypt join-accept payload error")
	}

	ok, err := phy.ValidateDownlinkJoinMIC(lorawan.JoinRequestType, d.joinEUI, d.devNonce, d.appKey)
	if err != nil {
		// log.WithFields(log.Fields{
		// 	"dev_eui": d.devEUI,
		// }).Debug("simulator: invalid join-accept MIC")
		return nil
	}
	if !ok {
		// log.WithFields(log.Fields{
		// 	"dev_eui": d.devEUI,
		// }).Debug("simulator: invalid join-accept MIC")
		return nil
	}

	jaPL, ok := phy.MACPayload.(*lorawan.JoinAcceptPayload)
	if !ok {
		return errors.New("expected *lorawan.JoinAcceptPayload")
	}

	d.appSKey, err = getAppSKey(jaPL.DLSettings.OptNeg, d.appKey, jaPL.HomeNetID, d.joinEUI, jaPL.JoinNonce, d.devNonce)
	if err != nil {
		return errors.Wrap(err, "get AppSKey error")
	}

	d.nwkSKey, err = getFNwkSIntKey(jaPL.DLSettings.OptNeg, d.appKey, jaPL.HomeNetID, d.joinEUI, jaPL.JoinNonce, d.devNonce)
	if err != nil {
		return errors.Wrap(err, "get NwkSKey error")
	}

	d.devAddr = jaPL.DevAddr

	// log.WithFields(log.Fields{
	// 	"dev_eui":     d.devEUI,
	// 	"dev_addr":    d.devAddr,
	// 	"app_name":    d.appName,
	// 	"device_name": d.deviceName,
	// }).Info(fmt.Sprintf("[%s] simulator: device OTAA activated", d.appName))

	d.setState(deviceStateActivated)
	DeviceJoinAcceptCounter(d.tenantID).Inc()

	return nil
}

// downlinkData validates and handles the downlink data.
func (d *Device) downlinkData(phy lorawan.PHYPayload) error {
	ok, err := phy.ValidateDownlinkDataMIC(lorawan.LoRaWAN1_0, 0, d.nwkSKey)
	if err != nil {
		log.WithFields(log.Fields{
			"dev_eui": d.devEUI,
		}).Debug("simulator: invalid downlink data MIC")
		return nil
	}

	if !ok {
		log.WithFields(log.Fields{
			"dev_eui": d.devEUI,
		}).Debug("simulator: invalid downlink data MIC")
		return nil
	}

	macPL, ok := phy.MACPayload.(*lorawan.MACPayload)
	if !ok {
		return fmt.Errorf("expected *lorawan.MACPayload, got: %T", phy.MACPayload)
	}

	gap := uint32(uint16(macPL.FHDR.FCnt) - uint16(d.fCntDown%(1<<16)))
	d.fCntDown = d.fCntDown + gap

	var data []byte
	var fPort uint8
	if macPL.FPort != nil {
		fPort = *macPL.FPort
	}

	if fPort != 0 {
		err := phy.DecryptFRMPayload(d.appSKey)
		if err != nil {
			return errors.Wrap(err, "decrypt frmpayload error")
		}

		if len(macPL.FRMPayload) != 0 {
			pl, ok := macPL.FRMPayload[0].(*lorawan.DataPayload)
			if !ok {
				return fmt.Errorf("expected *lorawan.DataPayload, got: %T", macPL.FRMPayload[0])
			}

			data = pl.Bytes
		}
	}

	// log.WithFields(log.Fields{
	// 	"confirmed":   phy.MHDR.MType == lorawan.ConfirmedDataDown,
	// 	"ack":         macPL.FHDR.FCtrl.ACK,
	// 	"f_cnt":       d.fCntDown,
	// 	"dev_eui":     d.devEUI,
	// 	"app_name":    d.appName,
	// 	"device_name": d.deviceName,
	// 	"f_port":      fPort,
	// 	"data":        hex.EncodeToString(data),
	// }).Info(fmt.Sprintf("[%s] simulator: device received downlink data", d.appName))

	if d.downlinkHandlerFunc == nil {
		return nil
	}

	return d.downlinkHandlerFunc(phy.MHDR.MType == lorawan.ConfirmedDataDown, macPL.FHDR.FCtrl.ACK, d.fCntDown, fPort, data)
}

// sendUplink sends
func (d *Device) sendUplink(phy lorawan.PHYPayload) error {
	b, err := phy.MarshalBinary()
	if err != nil {
		return errors.Wrap(err, "marshal phypayload error")
	}

	pl := gw.UplinkFrame{
		PhyPayload: b,
		TxInfo:     &d.uplinkTXInfo,
	}

	for i := range d.gateways {
		// Packet Loss Simulation
		if d.packetLoss > 0 && mrand.Float64()*100 < d.packetLoss {
			log.WithFields(log.Fields{
				"dev_eui": d.devEUI,
				"gateway": d.gateways[i].gatewayID,
				"loss_pct": d.packetLoss,
			}).Warn(fmt.Sprintf("[%s] simulator: simulated packet loss, dropping frame", d.appName))
			continue
		}

		gwItem := d.gateways[i]
		sendFn := func() {
			if err := gwItem.SendUplinkFrame(pl); err != nil {
				log.WithError(err).WithFields(log.Fields{
					"dev_eui": d.devEUI,
				}).Error(fmt.Sprintf("[%s] simulator: send uplink frame error", d.appName))
			}
		}

		// Latency Simulation
		if d.latencyMs > 0 {
			time.AfterFunc(time.Duration(d.latencyMs)*time.Millisecond, sendFn)
		} else {
			sendFn()
		}
	}

	return nil
}

// getDevNonce increments and returns a LoRaWAN DevNonce.
func (d *Device) getDevNonce() lorawan.DevNonce {
	if d.randomDevNonce {
		b := make([]byte, 2)
		_, _ = crand.Read(b)

		d.devNonce = lorawan.DevNonce(binary.BigEndian.Uint16(b))
	} else {
		d.devNonce++
	}

	return d.devNonce
}

// getState returns the current device state.
func (d *Device) getState() deviceState {
	d.RLock()
	defer d.RUnlock()

	return d.state
}

// setState sets the device to the given state.
func (d *Device) setState(s deviceState) {
	d.Lock()
	defer d.Unlock()

	d.state = s
}

type probeCandidate struct {
	family string
	fPort  uint8
	bytes  []byte
}

var probeCandidates = []probeCandidate{
	{
		family: "DRAGINO",
		fPort:  2,
		bytes:  []byte{0x0B, 0xB6, 0x09, 0x92, 0x02, 0x35, 0x01, 0x0A, 0x78, 0x7F, 0xFF},
	},
	{
		family: "MILESIGHT",
		fPort:  85,
		bytes:  []byte{0x01, 0x75, 0x5A, 0x03, 0x67, 0xF5, 0x00, 0x04, 0x68, 0x64, 0x05, 0x00, 0x00},
	},
	{
		family: "AGROSENSE",
		fPort:  8,
		bytes:  []byte{0x01, 0x75, 0x5A, 0x02, 0x67, 0xF5, 0x00, 0x03, 0x68, 0x64, 0x04, 0x6E, 0x50, 0x05, 0x66, 0xDC, 0x00, 0x06, 0x7D, 0x50, 0x02},
	},
	{
		family: "SENZEMO",
		fPort:  1,
		bytes:  []byte{0x0F, 0xF5, 0x00, 0x35, 0x02, 0xE4, 0x07, 0x5A},
	},
	{
		family: "CAYENNE",
		fPort:  1,
		bytes:  []byte{0x01, 0x67, 0xF5, 0x00, 0x02, 0x68, 0x64, 0x03, 0x73, 0xE4, 0x27, 0x04, 0x74, 0x5A, 0x01, 0x05, 0x7D, 0x50, 0x02},
	},
	{
		family: "ENGINKO",
		fPort:  1,
		bytes:  []byte{0x01, 0x5A, 0xA0, 0x09, 0x00, 0x00, 0x50, 0xC3, 0x00, 0x00, 0x90, 0x13, 0x00, 0x00, 0x60, 0x00, 0x00, 0x00},
	},
	{
		family: "ELECROW_4B",
		fPort:  1,
		bytes:  []byte{0x1D, 0x0D, 0x0E, 0xF4},
	},
	{
		family: "CUSTOM_2B",
		fPort:  1,
		bytes:  []byte{0x09, 0xC4, 0x13, 0x88},
	},
}

func probeScriptWithCandidate(vm *goja.Runtime, fn goja.Callable, c probeCandidate) int {
	inputObj := vm.NewObject()
	byteArr := make([]interface{}, len(c.bytes))
	for i, b := range c.bytes {
		byteArr[i] = int(b)
	}
	_ = inputObj.Set("bytes", byteArr)
	_ = inputObj.Set("fPort", c.fPort)

	res, err := fn(goja.Undefined(), inputObj)
	if err != nil || res == nil || goja.IsUndefined(res) || goja.IsNull(res) {
		return 0
	}

	resObj := res.ToObject(vm)
	if resObj == nil {
		return 0
	}

	targetObj := resObj
	dataVal := resObj.Get("data")
	if dataVal != nil && !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) {
		if dObj := dataVal.ToObject(vm); dObj != nil {
			targetObj = dObj
		}
	}

	score := 0
	for _, k := range targetObj.Keys() {
		v := targetObj.Get(k)
		if v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
			score++
		}
	}
	return score
}

func (d *Device) probeCodecFamily(vm *goja.Runtime) string {
	decVal := vm.Get("decodeUplink")
	if decVal == nil || goja.IsUndefined(decVal) || goja.IsNull(decVal) {
		return ""
	}

	decFn, ok := goja.AssertFunction(decVal)
	if !ok {
		return ""
	}

	bestFamily := ""
	bestScore := 0

	for _, cand := range probeCandidates {
		score := probeScriptWithCandidate(vm, decFn, cand)
		if score > bestScore {
			bestScore = score
			bestFamily = cand.family
		}
	}

	if bestScore > 0 {
		return bestFamily
	}

	// Heuristic by profile or device name
	profKey := strings.ToUpper(d.deviceProfileName + " " + d.deviceName)
	switch {
	case strings.Contains(profKey, "LHT65") || strings.Contains(profKey, "DRAGINO"):
		return "DRAGINO"
	case strings.Contains(profKey, "EM300") || strings.Contains(profKey, "MILESIGHT"):
		return "MILESIGHT"
	case strings.Contains(profKey, "AGRO"):
		return "AGROSENSE"
	case strings.Contains(profKey, "SMC30") || strings.Contains(profKey, "SENZEMO"):
		return "SENZEMO"
	case strings.Contains(profKey, "BROWAN") || strings.Contains(profKey, "TBHV"):
		return "CAYENNE"
	case strings.Contains(profKey, "ENGINKO") || strings.Contains(profKey, "MCF"):
		return "ENGINKO"
	default:
		return "FALLBACK_4B"
	}
}

func (d *Device) generateFamilyPayload(family string, anomaly string) []byte {
	nowNs := time.Now().UnixNano()
	tempC := 18.0 + float64(nowNs%140)/10.0
	humPct := 42.0 + float64((nowNs>>4)%380)/10.0
	pressHpa := 995.0 + float64((nowNs>>8)%300)/10.0
	batPct := uint8(78 + ((nowNs >> 12) % 22))
	batMv := uint16(3050 + ((nowNs >> 10) % 550))
	counter := uint16((d.fCntUp*3 + uint32(nowNs>>16)) % 65535)

	if anomaly == "spike" {
		tempC += 15.0
		humPct += 18.0
	} else if anomaly == "drift" {
		d.RLock()
		tempC += d.driftAccumulated
		d.RUnlock()
	}

	switch family {
	case "DRAGINO":
		batField := uint16(0x8000) | (batMv & 0x3FFF)
		tSht := int16(tempC * 100)
		hSht := uint16(humPct * 10)
		tDs := int16((tempC + 1.8) * 100)
		return []byte{
			byte(batField >> 8), byte(batField),
			byte(tSht >> 8), byte(tSht),
			byte(hSht >> 8), byte(hSht),
			0x01,
			byte(tDs >> 8), byte(tDs),
			0x7F, 0xFF,
		}
	case "MILESIGHT":
		t10 := int16(tempC * 10)
		h2 := byte(humPct * 2)
		leak := byte(0x00)
		if anomaly == "spike" {
			leak = 0x01
		}
		return []byte{
			0x01, 0x75, batPct,
			0x03, 0x67, byte(t10), byte(t10 >> 8),
			0x04, 0x68, h2,
			0x05, 0x00, leak,
		}
	case "AGROSENSE":
		t10 := int16(tempC * 10)
		h2 := byte(humPct * 2)
		soilMoist2 := byte((35.0 + float64((nowNs>>6)%300)/10.0) * 2)
		soilTemp10 := int16((tempC - 2.4) * 10)
		co2 := uint16(415 + ((nowNs >> 9) % 240))
		return []byte{
			0x01, 0x75, batPct,
			0x02, 0x67, byte(t10), byte(t10 >> 8),
			0x03, 0x68, h2,
			0x04, 0x6E, soilMoist2,
			0x05, 0x66, byte(soilTemp10), byte(soilTemp10 >> 8),
			0x06, 0x7D, byte(co2), byte(co2 >> 8),
		}
	case "SENZEMO":
		t10 := int16(tempC * 10)
		h10 := uint16(humPct * 10)
		pOffset10 := uint16((pressHpa - 800.0) * 10)
		return []byte{
			0x0F,
			byte(t10), byte(t10 >> 8),
			byte(h10), byte(h10 >> 8),
			byte(pOffset10), byte(pOffset10 >> 8),
			batPct,
		}
	case "CAYENNE":
		t10 := int16(tempC * 10)
		h2 := byte(humPct * 2)
		p10 := uint16(pressHpa * 10)
		v100 := batMv / 10
		co2 := uint16(460 + ((nowNs >> 7) % 350))
		return []byte{
			0x01, 0x67, byte(t10), byte(t10 >> 8),
			0x02, 0x68, h2,
			0x03, 0x73, byte(p10), byte(p10 >> 8),
			0x04, 0x74, byte(v100), byte(v100 >> 8),
			0x05, 0x7D, byte(co2), byte(co2 >> 8),
		}
	case "ENGINKO":
		pl := make([]byte, 18)
		pl[0] = 0x01
		pl[1] = batPct
		binary.LittleEndian.PutUint32(pl[2:6], uint32(int32(tempC*100)))
		binary.LittleEndian.PutUint32(pl[6:10], uint32(int32(pressHpa*100)))
		binary.LittleEndian.PutUint32(pl[10:14], uint32(int32(humPct*100)))
		binary.LittleEndian.PutUint32(pl[14:18], uint32(90+((nowNs>>11)%10)))
		return pl
	case "CUSTOM_2B":
		t100 := int16(tempC * 100)
		h10 := uint16(humPct * 10)
		return []byte{
			byte(t100 >> 8), byte(t100),
			byte(h10 >> 8), byte(h10),
		}
	case "ELECROW_4B", "FALLBACK_4B":
		fallthrough
	default:
		t100 := int16(tempC * 100)
		return []byte{
			byte(counter >> 8), byte(counter),
			byte(t100 >> 8), byte(t100),
		}
	}
}
