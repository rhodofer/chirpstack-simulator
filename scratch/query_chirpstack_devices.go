package main

import (
	"context"
	"fmt"
	"log"
	"time"

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

	totalDevices := 0
	activeDevices := 0
	now := time.Now()

	fmt.Println("================ CHIRPSTACK DETAYLI CIHAZ VE TELEMETRİ RAPORU ================")

	for _, t := range tenants.GetResult() {
		fmt.Printf("\n🏢 Organizasyon / Tenant: %s (ID: %s)\n", t.GetName(), t.GetId())

		apps, err := as.Application().List(ctx, &api.ListApplicationsRequest{TenantId: t.GetId(), Limit: 100})
		if err != nil {
			fmt.Printf("   Uygulamalar alınamadı: %v\n", err)
			continue
		}

		for _, app := range apps.GetResult() {
			fmt.Printf("  📁 Uygulama: %s (ID: %s)\n", app.GetName(), app.GetId())

			devs, err := as.Device().List(ctx, &api.ListDevicesRequest{ApplicationId: app.GetId(), Limit: 100})
			if err != nil {
				fmt.Printf("     Cihazlar alınamadı: %v\n", err)
				continue
			}

			for _, d := range devs.GetResult() {
				totalDevices++
				devEUI := d.GetDevEui()

				dDetail, err := as.Device().Get(ctx, &api.GetDeviceRequest{DevEui: devEUI})
				if err != nil {
					fmt.Printf("     - %s (%s): Detay okunamadı (%v)\n", d.GetName(), devEUI, err)
					continue
				}

				dev := dDetail.GetDevice()
				lastSeenStr := "Hiç görülmedi"
				isActive := false

				if dDetail.GetLastSeenAt() != nil {
					lastSeen := dDetail.GetLastSeenAt().AsTime()
					diff := now.Sub(lastSeen)
					lastSeenStr = fmt.Sprintf("%s önce (%s)", formatDuration(diff), lastSeen.Format("15:04:05"))

					// Son 10 dakika içinde görülmüşse aktif kabul et
					if diff < 10*time.Minute {
						isActive = true
						activeDevices++
					}
				}

				statusIcon := "🔴 Pasif"
				if isActive {
					statusIcon = "🟢 Aktif (Veri Gönderiyor)"
				}

				fmt.Printf("     • Cihaz: %-32s | EUI: %s | Durum: %s | Son Görülme: %s | Disabled: %t\n",
					dev.GetName(), devEUI, statusIcon, lastSeenStr, dev.GetIsDisabled())
			}
		}
	}

	fmt.Println("\n==========================================================================")
	fmt.Printf("📊 ÖZET RAPOR:\n")
	fmt.Printf("  • Toplam Kayıtlı Cihaz Sayısı: %d\n", totalDevices)
	fmt.Printf("  • Son 10 Dk İçinde Veri Gönderen AKTİF Cihaz Sayısı: %d\n", activeDevices)
	fmt.Printf("  • Pasif / Inactive Cihaz Sayısı: %d\n", totalDevices-activeDevices)
	fmt.Println("==========================================================================")
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm %ds", int(d.Minutes()), int(d.Seconds())%60)
	}
	return fmt.Sprintf("%dh %dm", int(d.Hours()), int(d.Minutes())%60)
}
