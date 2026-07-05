package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/brocaar/lorawan"
	sim_pkg "github.com/brocaar/chirpstack-simulator/simulator"
)

func TestHandleSimulationGateways(t *testing.T) {
	// Clear registry before test
	sim_pkg.ActiveGateways.Clear()

	// 1. Test empty registry
	req := httptest.NewRequest(http.MethodGet, "/api/simulation/gateways", nil)
	w := httptest.NewRecorder()

	handleSimulationGateways(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var data map[string][]sim_pkg.GatewayStatus
	if err := json.NewDecoder(w.Body).Decode(&data); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(data["gateways"]) != 0 {
		t.Errorf("Expected 0 gateways, got %d", len(data["gateways"]))
	}

	// 2. Test registry with a registered gateway
	gwID := lorawan.EUI64{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08}
	gw, err := sim_pkg.NewGateway(
		sim_pkg.WithGatewayID(gwID),
		sim_pkg.WithGatewayTenantID("test-tenant-1"),
		sim_pkg.WithEventTopicTemplate("gateway/{{ .GatewayID }}/event/{{ .Event }}"),
		sim_pkg.WithCommandTopicTemplate("gateway/{{ .GatewayID }}/command/{{ .Command }}"),
	)
	if err != nil {
		t.Fatalf("Failed to create mock gateway: %v", err)
	}

	w2 := httptest.NewRecorder()
	handleSimulationGateways(w2, req)

	resp2 := w2.Result()
	if resp2.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp2.StatusCode)
	}

	var data2 map[string][]sim_pkg.GatewayStatus
	if err := json.NewDecoder(w2.Body).Decode(&data2); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(data2["gateways"]) != 1 {
		t.Errorf("Expected 1 gateway, got %d", len(data2["gateways"]))
	}

	gwStatus := data2["gateways"][0]
	if gwStatus.GatewayID != "0102030405060708" {
		t.Errorf("Expected gateway ID 0102030405060708, got %s", gwStatus.GatewayID)
	}
	if gwStatus.TenantID != "test-tenant-1" {
		t.Errorf("Expected tenant ID test-tenant-1, got %s", gwStatus.TenantID)
	}

	// Clean up
	sim_pkg.ActiveGateways.Unregister(gw.GetGatewayID())
}
