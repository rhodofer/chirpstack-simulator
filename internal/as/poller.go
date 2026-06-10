package as

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/chirpstack/chirpstack/api/go/v4/common"
	log "github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var (
	pollerMu      sync.Mutex
	pollerRunning bool
	pollerCancel  context.CancelFunc
)

// StartPoller begins periodic polling of ChirpStack device link metrics via gRPC.
// It emits log lines prefixed with "as/integration:" so the frontend
// classifies them as "remote" ChirpStack events.
func StartPoller(ctx context.Context) {
	pollerMu.Lock()
	defer pollerMu.Unlock()

	if pollerRunning {
		return
	}

	pollerCtx, cancel := context.WithCancel(ctx)
	pollerCancel = cancel
	pollerRunning = true

	go runPoller(pollerCtx)
	log.Info("as/poller: ChirpStack gRPC link metrics poller started")
}

// StopPoller stops the background poller.
func StopPoller() {
	pollerMu.Lock()
	defer pollerMu.Unlock()
	if pollerCancel != nil {
		pollerCancel()
	}
	pollerRunning = false
}

// runPoller polls ChirpStack every 15 seconds for uplink events across all tenants.
func runPoller(ctx context.Context) {
	// Track last seen uplink count per device to emit only new events.
	lastUplinkCount := make(map[string]float64)

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	// First poll: silently establish baseline (no logging).
	// This prevents flooding the console with historical hourly uplink counts.
	select {
	case <-ctx.Done():
		return
	case <-time.After(5 * time.Second):
	}
	pollAllDevices(ctx, lastUplinkCount, true /* baselineOnly */)
	log.Info("as/poller: baseline established, watching for new ChirpStack uplinks...")

	for {
		select {
		case <-ctx.Done():
			log.Info("as/poller: stopped")
			return
		case <-ticker.C:
			pollAllDevices(ctx, lastUplinkCount, false)
		}
	}
}

// pollAllDevices iterates all tenants → applications → devices and fetches link metrics.
// baselineOnly = true: silently record counts without logging (startup pass).
func pollAllDevices(ctx context.Context, lastUplinkCount map[string]float64, baselineOnly bool) {
	if clientConn == nil {
		return
	}

	tenantSvc := api.NewTenantServiceClient(clientConn)
	appSvc := api.NewApplicationServiceClient(clientConn)
	devSvc := api.NewDeviceServiceClient(clientConn)

	tenantsResp, err := tenantSvc.List(ctx, &api.ListTenantsRequest{Limit: 100})
	if err != nil {
		log.WithError(err).Debug("as/poller: failed to list tenants")
		return
	}

	for _, tenant := range tenantsResp.GetResult() {
		appsResp, err := appSvc.List(ctx, &api.ListApplicationsRequest{
			Limit:    100,
			TenantId: tenant.GetId(),
		})
		if err != nil {
			continue
		}

		for _, app := range appsResp.GetResult() {
			devsResp, err := devSvc.List(ctx, &api.ListDevicesRequest{
				Limit:         100,
				ApplicationId: app.GetId(),
			})
			if err != nil {
				continue
			}

			for _, dev := range devsResp.GetResult() {
				devEUI := dev.GetDevEui()
				pollDeviceLinkMetrics(
					ctx, devSvc,
					devEUI, dev.GetName(), app.GetName(), tenant.GetName(),
					lastUplinkCount, baselineOnly,
				)
			}
		}
	}
}

// pollDeviceLinkMetrics fetches uplink stats for one device and logs new uplinks.
// When baselineOnly is true, the count is recorded silently (no log output).
func pollDeviceLinkMetrics(
	ctx context.Context,
	devSvc api.DeviceServiceClient,
	devEUI, devName, appName, tenantName string,
	lastUplinkCount map[string]float64,
	baselineOnly bool,
) {
	now := time.Now().UTC()
	start := now.Truncate(24 * time.Hour) // start of today UTC

	resp, err := devSvc.GetLinkMetrics(ctx, &api.GetDeviceLinkMetricsRequest{
		DevEui:      devEUI,
		Start:       timestamppb.New(start),
		End:         timestamppb.New(now),
		Aggregation: common.Aggregation_DAY,
	})
	if err != nil {
		log.WithFields(log.Fields{
			"dev_eui": devEUI,
			"error":   err,
		}).Debug("as/poller: failed to get link metrics")
		return
	}

	// Sum rx_packets (received uplinks) across returned buckets.
	var rxTotal float32
	if m := resp.GetRxPackets(); m != nil {
		for _, ds := range m.GetDatasets() {
			for _, v := range ds.GetData() {
				rxTotal += v
			}
		}
	}

	key := fmt.Sprintf("%s:rx", devEUI)
	prev := float32(lastUplinkCount[key])

	if baselineOnly {
		// Silently record current count as baseline — no logging.
		lastUplinkCount[key] = float64(rxTotal)
		return
	}

	if rxTotal > prev {
		delta := int(rxTotal - prev)
		lastUplinkCount[key] = float64(rxTotal)
		for i := 0; i < delta; i++ {
			log.WithFields(log.Fields{
				"app_name":    appName,
				"dev_eui":     devEUI,
				"device_name": devName,
			}).Infof(
				"as/integration: [ChirpStack Integration] Uplink received from '%s' (%s) → ChirpStack [%s / %s]",
				devName, devEUI, appName, tenantName,
			)
		}
	}
}
