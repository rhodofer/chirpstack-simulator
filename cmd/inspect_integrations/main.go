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
	appID := "4b0c7df8-d8c5-4b72-8a60-31da29e1b3a8"
	
	// List integrations
	resp, err := as.Application().ListIntegrations(ctx, &api.ListApplicationIntegrationsRequest{ApplicationId: appID})
	if err != nil {
		fmt.Printf("ListIntegrations error: %v\n", err)
	} else {
		fmt.Printf("Integrations for app %s:\n", appID)
		for _, integ := range resp.GetResult() {
			fmt.Printf("  Integration Kind: %v\n", integ.GetKind())
		}
	}

	// Try GetHttpIntegration
	httpResp, err := as.Application().GetHttpIntegration(ctx, &api.GetHttpIntegrationRequest{ApplicationId: appID})
	if err != nil {
		fmt.Printf("GetHttpIntegration error: %v\n", err)
	} else if httpResp.GetIntegration() != nil {
		i := httpResp.GetIntegration()
		fmt.Printf("HTTP Integration Event Endpoint: %s\n", i.GetEventEndpointUrl())
		fmt.Printf("Headers: %v\n", i.GetHeaders())
	}
}
