package main

import (
	"context"
	"fmt"
	"log"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
)

func main() {
	config.C.ChirpStack.API.Server = "100.64.0.9:8080"
	config.C.ChirpStack.API.APIKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6ImVhYWE1ZTRkLTdkMWUtNDliMy1iM2I2LWMwZjQ2YjA1MTFlZCIsInR5cCI6ImtleSJ9.SOr_ltR7MBD6RS-keeuZs-KLd7aL8qTv6mejHDuCEek"
	config.C.ChirpStack.API.Insecure = true
	config.C.ChirpStack.Integration.MQTT.Server = "tcp://100.64.0.9:1883"

	if err := as.Setup(config.C); err != nil {
		log.Fatalf("as.Setup error: %v", err)
	}

	ctx := context.Background()
	tenants, err := as.Tenant().List(ctx, &api.ListTenantsRequest{Limit: 100})
	if err != nil {
		log.Fatalf("ListTenants error: %v", err)
	}

	for _, t := range tenants.GetResult() {
		apps, err := as.Application().List(ctx, &api.ListApplicationsRequest{TenantId: t.GetId(), Limit: 100})
		if err != nil {
			continue
		}
		for _, app := range apps.GetResult() {
			devs, err := as.Device().List(ctx, &api.ListDevicesRequest{ApplicationId: app.GetId(), Limit: 100})
			if err != nil {
				continue
			}
			for _, d := range devs.GetResult() {
				devEUI := d.GetDevEui()
				keysResp, keysErr := as.Device().GetKeys(ctx, &api.GetDeviceKeysRequest{DevEui: devEUI})
				keyStr := "8e124e97490d178398c104566ce7729c"
				if keysErr == nil && keysResp != nil && keysResp.GetDeviceKeys() != nil {
					if keysResp.GetDeviceKeys().GetNwkKey() != "" {
						keyStr = keysResp.GetDeviceKeys().GetNwkKey()
					}
				}

				// Reset DevNonce memory in ChirpStack by recreating device keys
				_, _ = as.Device().DeleteKeys(ctx, &api.DeleteDeviceKeysRequest{DevEui: devEUI})
				_, createErr := as.Device().CreateKeys(ctx, &api.CreateDeviceKeysRequest{
					DeviceKeys: &api.DeviceKeys{
						DevEui: devEUI,
						NwkKey: keyStr,
						AppKey: keyStr,
					},
				})
				if createErr == nil {
					fmt.Printf("Reset keys & DevNonce memory for %s (%s)\n", d.GetName(), devEUI)
				} else {
					fmt.Printf("Error recreating keys for %s (%s): %v\n", d.GetName(), devEUI, createErr)
				}
			}
		}
	}
}
