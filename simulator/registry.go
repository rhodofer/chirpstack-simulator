package simulator

import (
	"sync"

	"github.com/brocaar/lorawan"
)

// DeviceStatus defines the current state of a simulated device.
type DeviceStatus struct {
	DevEUI        string `json:"dev_eui"`
	DeviceName    string `json:"device_name"`
	AppName       string `json:"app_name"`
	State         string `json:"state"` // "OTAA" or "Activated"
	UplinkCount   uint32 `json:"uplink_count"`
	ActiveAnomaly string `json:"active_anomaly"`
	TenantID      string `json:"tenant_id"`
	ApplicationID string `json:"application_id"`
}

// DeviceRegistry tracks all actively simulated devices.
type DeviceRegistry struct {
	mu      sync.RWMutex
	devices map[lorawan.EUI64]*Device
}

// ActiveDevices is the global registry of running device simulations.
var ActiveDevices = &DeviceRegistry{
	devices: make(map[lorawan.EUI64]*Device),
}

// Register adds a device to the registry.
func (r *DeviceRegistry) Register(d *Device) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.devices[d.devEUI] = d
}

// Unregister removes a device from the registry.
func (r *DeviceRegistry) Unregister(devEUI lorawan.EUI64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.devices, devEUI)
}

// Clear clears all devices from the registry.
func (r *DeviceRegistry) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.devices = make(map[lorawan.EUI64]*Device)
}

// GetDevice returns the Device pointer by EUI64.
func (r *DeviceRegistry) GetDevice(devEUI lorawan.EUI64) *Device {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.devices[devEUI]
}

// GetStatuses returns a list of all active device statuses.
func (r *DeviceRegistry) GetStatuses() []DeviceStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	statuses := make([]DeviceStatus, 0, len(r.devices))
	for _, d := range r.devices {
		d.RLock()
		stateStr := "OTAA"
		if d.state == deviceStateActivated {
			stateStr = "Activated"
		}
		
		activeAnomaly := ""
		if d.manualAnomalyActive {
			activeAnomaly = d.manualAnomalyType + " (manual)"
		} else if d.activeAnomalyType != "" {
			activeAnomaly = d.activeAnomalyType + " (prob)"
		}
		
		statuses = append(statuses, DeviceStatus{
			DevEUI:        d.devEUI.String(),
			DeviceName:    d.deviceName,
			AppName:       d.appName,
			State:         stateStr,
			UplinkCount:   d.fCntUp,
			ActiveAnomaly: activeAnomaly,
			TenantID:      d.tenantID,
			ApplicationID: d.applicationID,
		})
		d.RUnlock()
	}
	return statuses
}

// GatewayStatus defines the current state of a simulated gateway.
type GatewayStatus struct {
	GatewayID     string `json:"gateway_id"`
	TenantID      string `json:"tenant_id"`
	UplinkCount   uint32 `json:"uplink_count"`
	DownlinkCount uint32 `json:"downlink_count"`
}

// GatewayRegistry tracks all actively simulated gateways.
type GatewayRegistry struct {
	mu       sync.RWMutex
	gateways map[lorawan.EUI64]*Gateway
}

// ActiveGateways is the global registry of running gateway simulations.
var ActiveGateways = &GatewayRegistry{
	gateways: make(map[lorawan.EUI64]*Gateway),
}

// Register adds a gateway to the registry.
func (r *GatewayRegistry) Register(g *Gateway) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.gateways[g.gatewayID] = g
}

// Unregister removes a gateway from the registry.
func (r *GatewayRegistry) Unregister(gatewayID lorawan.EUI64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.gateways, gatewayID)
}

// Clear clears all gateways from the registry.
func (r *GatewayRegistry) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.gateways = make(map[lorawan.EUI64]*Gateway)
}

// GetStatuses returns a list of all active gateway statuses.
func (r *GatewayRegistry) GetStatuses() []GatewayStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	statuses := make([]GatewayStatus, 0, len(r.gateways))
	for _, g := range r.gateways {
		statuses = append(statuses, GatewayStatus{
			GatewayID:     g.GetGatewayID().String(),
			TenantID:      g.GetTenantID(),
			UplinkCount:   g.GetUplinkCount(),
			DownlinkCount: g.GetDownlinkCount(),
		})
	}
	return statuses
}
