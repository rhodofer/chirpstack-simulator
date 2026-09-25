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

	// 1. All tenants
	tenants, err := as.Tenant().List(ctx, &api.ListTenantsRequest{Limit: 100})
	if err != nil {
		log.Fatalf("ListTenants error: %v", err)
	}

	targetURL := "https://api-falt.iofeteknoloji.com/api/v1/webhook/chirpstack"
	headers := map[string]string{
		"X-ChirpStack-Secret": "falt_secure_webhook_2026_x86",
		"Authorization":      "Bearer falt_secure_webhook_2026_x86",
	}

	fmt.Println("================ CHIRPSTACK WEBHOOK GÜNCELLEME İŞLEMİ ================")

	for _, t := range tenants.GetResult() {
		fmt.Printf("\n🏢 Tenant: %s (ID: %s)\n", t.GetName(), t.GetId())

		apps, err := as.Application().List(ctx, &api.ListApplicationsRequest{TenantId: t.GetId(), Limit: 100})
		if err != nil {
			fmt.Printf("   Uygulamalar alınamadı: %v\n", err)
			continue
		}

		for _, app := range apps.GetResult() {
			appID := app.GetId()
			fmt.Printf("  📁 Uygulama: %s (ID: %s)\n", app.GetName(), appID)

			integ := &api.HttpIntegration{
				ApplicationId:    appID,
				Encoding:         api.Encoding_JSON,
				EventEndpointUrl: targetURL,
				Headers:          headers,
			}

			_, err := as.Application().UpdateHttpIntegration(ctx, &api.UpdateHttpIntegrationRequest{
				Integration: integ,
			})
			if err != nil {
				// Try Create
				_, createErr := as.Application().CreateHttpIntegration(ctx, &api.CreateHttpIntegrationRequest{
					Integration: integ,
				})
				if createErr != nil {
					fmt.Printf("     ❌ HTTP Integration Güncelleme/Oluşturma Hatası: %v\n", createErr)
				} else {
					fmt.Printf("     ✅ HTTP Integration OLUŞTURULDU -> %s\n", targetURL)
				}
			} else {
				fmt.Printf("     ✅ HTTP Integration GÜNCELLENDİ -> %s\n", targetURL)
			}
		}
	}

	fmt.Println("\n==========================================================================")
	fmt.Println("Tüm ChirpStack uygulamalarının Webhook URL'leri başarıyla güncellendi!")
	fmt.Println("==========================================================================")
}
