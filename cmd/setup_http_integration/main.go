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
	config.C.ChirpStack.Gateway.Backend.MQTT.Server = "tcp://100.64.0.9:1883"

	if err := as.Setup(config.C); err != nil {
		log.Fatalf("as.Setup error: %v", err)
	}

	ctx := context.Background()
	appID := "4b0c7df8-d8c5-4b72-8a60-31da29e1b3a8" // Raman2-Raman2ag-1

	fmt.Printf("Checking HTTP Integration for Application %s...\n", appID)
	getResp, err := as.Application().GetHttpIntegration(ctx, &api.GetHttpIntegrationRequest{
		ApplicationId: appID,
	})
	if err != nil {
		fmt.Printf("GetHttpIntegration result: %v\n", err)
	} else {
		integ := getResp.GetIntegration()
		if integ != nil {
			fmt.Printf("Current HTTP Integration URL: %s\n", integ.GetEventEndpointUrl())
			fmt.Printf("Headers: %v\n", integ.GetHeaders())
		}
	}

	// Set or update HTTP Integration
	targetURL := "http://100.64.0.3:8000/api/v1/webhook/chirpstack/uplink"
	headers := map[string]string{
		"Authorization": "Bearer falt_secure_webhook_2026_x86",
	}

	fmt.Printf("\nSetting/Updating HTTP Integration to URL: %s\n", targetURL)
	_, updateErr := as.Application().UpdateHttpIntegration(ctx, &api.UpdateHttpIntegrationRequest{
		Integration: &api.HttpIntegration{
			ApplicationId:    appID,
			Encoding:         api.Encoding_JSON,
			EventEndpointUrl: targetURL,
			Headers:          headers,
		},
	})
	if updateErr != nil {
		fmt.Printf("UpdateHttpIntegration failed, trying CreateHttpIntegration... Error: %v\n", updateErr)
		_, createErr := as.Application().CreateHttpIntegration(ctx, &api.CreateHttpIntegrationRequest{
			Integration: &api.HttpIntegration{
				ApplicationId:    appID,
				Encoding:         api.Encoding_JSON,
				EventEndpointUrl: targetURL,
				Headers:          headers,
			},
		})
		if createErr != nil {
			fmt.Printf("CreateHttpIntegration failed: %v\n", createErr)
		} else {
			fmt.Println("CreateHttpIntegration SUCCESS!")
		}
	} else {
		fmt.Println("UpdateHttpIntegration SUCCESS!")
	}

	// Check Device Profile Codec
	dpID := "01d04530-38c9-47b5-b25b-dd7497d28762" // Raman2-Raman2ag-1-profile
	dpResp, err := as.DeviceProfile().Get(ctx, &api.GetDeviceProfileRequest{Id: dpID})
	if err == nil && dpResp.GetDeviceProfile() != nil {
		dp := dpResp.GetDeviceProfile()
		fmt.Printf("\nUpdating Device Profile %s JS Codec...\n", dp.GetName())
		
		jsCodec := `
function decodeUplink(input) {
  var bytes = input.bytes;
  var temp = (bytes[0] << 8) | bytes[1];
  var hum = bytes[2];
  return {
    data: {
      temperature: temp / 10.0,
      humidity: hum,
      raw: bytes
    }
  };
}
`
		dp.PayloadCodecRuntime = api.CodecRuntime_JS
		dp.PayloadCodecScript = jsCodec

		_, err = as.DeviceProfile().Update(ctx, &api.UpdateDeviceProfileRequest{
			DeviceProfile: dp,
		})
		if err != nil {
			fmt.Printf("DeviceProfile Update error: %v\n", err)
		} else {
			fmt.Println("DeviceProfile Codec JS set successfully!")
		}
	}
}
