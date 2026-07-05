package simulator

import (
	"testing"

	"github.com/brocaar/lorawan"
)

func TestGatewayProperties(t *testing.T) {
	gwID := lorawan.EUI64{1, 1, 1, 1, 1, 1, 1, 1}
	gw, err := NewGateway(
		WithGatewayID(gwID),
		WithGatewayTenantID("test-tenant-2"),
		WithEventTopicTemplate("gateway/{{ .GatewayID }}/event/{{ .Event }}"),
		WithCommandTopicTemplate("gateway/{{ .GatewayID }}/command/{{ .Command }}"),
	)
	if err != nil {
		t.Fatalf("Failed to create gateway: %v", err)
	}

	// Clean up after test
	defer ActiveGateways.Unregister(gwID)

	// 1. Verify IDs and Getters
	if gw.GetGatewayID() != gwID {
		t.Errorf("Expected GatewayID %s, got %s", gwID.String(), gw.GetGatewayID().String())
	}
	if gw.GetTenantID() != "test-tenant-2" {
		t.Errorf("Expected TenantID test-tenant-2, got %s", gw.GetTenantID())
	}

	// 2. Verify Initial Counters
	if gw.GetUplinkCount() != 0 {
		t.Errorf("Expected initial uplink count 0, got %d", gw.GetUplinkCount())
	}
	if gw.GetDownlinkCount() != 0 {
		t.Errorf("Expected initial downlink count 0, got %d", gw.GetDownlinkCount())
	}

	// 3. Verify ActiveGateways registry contains this gateway
	found := false
	for _, status := range ActiveGateways.GetStatuses() {
		if status.GatewayID == "0101010101010101" {
			found = true
			if status.TenantID != "test-tenant-2" {
				t.Errorf("Expected registered tenant ID test-tenant-2, got %s", status.TenantID)
			}
			break
		}
	}
	if !found {
		t.Error("Gateway was not automatically registered in ActiveGateways")
	}
}
