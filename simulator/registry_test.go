package simulator

import (
	"testing"

	"github.com/brocaar/lorawan"
)

func TestDeviceRegistry(t *testing.T) {
	ActiveDevices.Clear()

	devEUI := lorawan.EUI64{1, 2, 3, 4, 5, 6, 7, 8}
	dev := &Device{
		devEUI:        devEUI,
		deviceName:    "test-device",
		appName:       "test-app",
		tenantID:      "test-tenant",
		applicationID: "test-app-id",
		state:         deviceStateOTAA,
	}

	// 1. Test Register
	ActiveDevices.Register(dev)
	if len(ActiveDevices.devices) != 1 {
		t.Errorf("Expected 1 device, got %d", len(ActiveDevices.devices))
	}

	// 2. Test GetDevice
	found := ActiveDevices.GetDevice(devEUI)
	if found == nil || found.deviceName != "test-device" {
		t.Errorf("GetDevice failed to retrieve the correct device")
	}

	// 3. Test GetStatuses
	statuses := ActiveDevices.GetStatuses()
	if len(statuses) != 1 {
		t.Errorf("Expected 1 status, got %d", len(statuses))
	}
	if statuses[0].DevEUI != "0102030405060708" {
		t.Errorf("Expected DevEUI 0102030405060708, got %s", statuses[0].DevEUI)
	}

	// 4. Test Unregister
	ActiveDevices.Unregister(devEUI)
	if len(ActiveDevices.devices) != 0 {
		t.Errorf("Expected 0 devices after unregistration, got %d", len(ActiveDevices.devices))
	}

	// 5. Test Clear
	ActiveDevices.Register(dev)
	ActiveDevices.Clear()
	if len(ActiveDevices.devices) != 0 {
		t.Errorf("Expected 0 devices after clear, got %d", len(ActiveDevices.devices))
	}
}

func TestGatewayRegistry(t *testing.T) {
	ActiveGateways.Clear()

	gwID := lorawan.EUI64{8, 7, 6, 5, 4, 3, 2, 1}
	gw := &Gateway{
		gatewayID: gwID,
		tenantID:  "test-tenant-gw",
	}

	// 1. Test Register
	ActiveGateways.Register(gw)
	if len(ActiveGateways.gateways) != 1 {
		t.Errorf("Expected 1 gateway, got %d", len(ActiveGateways.gateways))
	}

	// 2. Test GetStatuses
	statuses := ActiveGateways.GetStatuses()
	if len(statuses) != 1 {
		t.Errorf("Expected 1 status, got %d", len(statuses))
	}
	if statuses[0].GatewayID != "0807060504030201" {
		t.Errorf("Expected GatewayID 0807060504030201, got %s", statuses[0].GatewayID)
	}

	// 3. Test Unregister
	ActiveGateways.Unregister(gwID)
	if len(ActiveGateways.gateways) != 0 {
		t.Errorf("Expected 0 gateways after unregistration, got %d", len(ActiveGateways.gateways))
	}

	// 4. Test Clear
	ActiveGateways.Register(gw)
	ActiveGateways.Clear()
	if len(ActiveGateways.gateways) != 0 {
		t.Errorf("Expected 0 gateways after clear, got %d", len(ActiveGateways.gateways))
	}
}
