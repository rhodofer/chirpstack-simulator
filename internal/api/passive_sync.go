package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	csapi "github.com/chirpstack/chirpstack/api/go/v4/api"
	log "github.com/sirupsen/logrus"
)

// TopologySnapshot is a point-in-time snapshot of ChirpStack entities.
type TopologySnapshot struct {
	TenantIDs        []string `json:"tenant_ids"`
	GatewayEUIs      []string `json:"gateway_euis"`
	DeviceProfileIDs []string `json:"device_profile_ids"`
	ApplicationIDs   []string `json:"application_ids"`
	DeviceEUIs       []string `json:"device_euis"`
	TakenAt          time.Time `json:"taken_at"`
}

// PassiveSyncState holds shared sync service state.
type PassiveSyncState struct {
	mu             sync.RWMutex
	LastSnapshot   *TopologySnapshot
	LastSyncAt     time.Time
	PendingChanges bool
	ChangesSummary []string
	stopCh         chan struct{}
	running        bool
}

// syncState is the package-level singleton.
var syncState = &PassiveSyncState{}

// StartPassiveSync starts the background topology polling goroutine.
func StartPassiveSync(intervalMinutes int) {
	syncState.mu.Lock()
	defer syncState.mu.Unlock()

	if syncState.running {
		return
	}

	syncState.stopCh = make(chan struct{})
	syncState.running = true

	go func() {
		log.WithField("interval_minutes", intervalMinutes).Info("passive_sync: poller started")
		ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
		defer ticker.Stop()

		// Take an initial snapshot immediately on start
		doSync()

		for {
			select {
			case <-ticker.C:
				doSync()
			case <-syncState.stopCh:
				log.Info("passive_sync: poller stopped")
				return
			}
		}
	}()
}

// StopPassiveSync stops the background polling goroutine.
func StopPassiveSync() {
	syncState.mu.Lock()
	defer syncState.mu.Unlock()

	if !syncState.running {
		return
	}

	close(syncState.stopCh)
	syncState.running = false
}

// TriggerManualSync performs an immediate synchronization check.
func TriggerManualSync() error {
	return doSync()
}

// doSync takes a snapshot and compares with the previous one.
func doSync() error {
	if !as.IsConnected() {
		log.Warn("passive_sync: ChirpStack not connected, skipping sync")
		return fmt.Errorf("chirpstack not connected")
	}

	snap, err := takeSnapshot()
	if err != nil {
		log.WithError(err).Warn("passive_sync: snapshot failed")
		return err
	}

	syncState.mu.Lock()
	defer syncState.mu.Unlock()

	syncState.LastSyncAt = time.Now()

	if syncState.LastSnapshot == nil {
		// First run — no comparison needed
		syncState.LastSnapshot = snap
		log.Info("passive_sync: initial snapshot taken")
		return nil
	}

	changes := compareSnapshots(syncState.LastSnapshot, snap)
	syncState.LastSnapshot = snap

	if len(changes) > 0 {
		syncState.PendingChanges = true
		syncState.ChangesSummary = changes
		log.WithField("changes", changes).Info("passive_sync: topology change detected")
		broadcastTopologyChange(changes)
	} else {
		log.Debug("passive_sync: no topology changes detected")
	}

	return nil
}

// takeSnapshot queries all ChirpStack entities and returns a snapshot.
func takeSnapshot() (*TopologySnapshot, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	snap := &TopologySnapshot{TakenAt: time.Now()}

	// --- Tenants ---
	tResp, err := as.Tenant().List(ctx, &csapi.ListTenantsRequest{Limit: 200})
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	for _, t := range tResp.GetResult() {
		snap.TenantIDs = append(snap.TenantIDs, t.GetId())
	}
	sort.Strings(snap.TenantIDs)

	// --- Gateways (across all tenants) ---
	for _, tid := range snap.TenantIDs {
		gResp, err := as.Gateway().List(ctx, &csapi.ListGatewaysRequest{TenantId: tid, Limit: 1000})
		if err != nil {
			log.WithError(err).Warnf("passive_sync: list gateways for tenant %s failed", tid)
			continue
		}
		for _, g := range gResp.GetResult() {
			snap.GatewayEUIs = append(snap.GatewayEUIs, g.GetGatewayId())
		}
	}
	sort.Strings(snap.GatewayEUIs)

	// --- Device Profiles ---
	for _, tid := range snap.TenantIDs {
		dpResp, err := as.DeviceProfile().List(ctx, &csapi.ListDeviceProfilesRequest{TenantId: tid, Limit: 1000})
		if err != nil {
			log.WithError(err).Warnf("passive_sync: list device-profiles for tenant %s failed", tid)
			continue
		}
		for _, dp := range dpResp.GetResult() {
			snap.DeviceProfileIDs = append(snap.DeviceProfileIDs, dp.GetId())
		}
	}
	sort.Strings(snap.DeviceProfileIDs)

	// --- Applications ---
	for _, tid := range snap.TenantIDs {
		appResp, err := as.Application().List(ctx, &csapi.ListApplicationsRequest{TenantId: tid, Limit: 1000})
		if err != nil {
			log.WithError(err).Warnf("passive_sync: list applications for tenant %s failed", tid)
			continue
		}
		for _, a := range appResp.GetResult() {
			snap.ApplicationIDs = append(snap.ApplicationIDs, a.GetId())
		}
	}
	sort.Strings(snap.ApplicationIDs)

	// --- Devices ---
	for _, appID := range snap.ApplicationIDs {
		devResp, err := as.Device().List(ctx, &csapi.ListDevicesRequest{ApplicationId: appID, Limit: 1000})
		if err != nil {
			log.WithError(err).Warnf("passive_sync: list devices for app %s failed", appID)
			continue
		}
		for _, d := range devResp.GetResult() {
			snap.DeviceEUIs = append(snap.DeviceEUIs, d.GetDevEui())
		}
	}
	sort.Strings(snap.DeviceEUIs)

	return snap, nil
}

// compareSnapshots returns a human-readable list of changes between two snapshots.
func compareSnapshots(old, new *TopologySnapshot) []string {
	var changes []string

	added, removed := diffSlices(old.TenantIDs, new.TenantIDs)
	if len(added) > 0 {
		changes = append(changes, fmt.Sprintf("Yeni tenant eklendi: %s", strings.Join(added, ", ")))
	}
	if len(removed) > 0 {
		changes = append(changes, fmt.Sprintf("Tenant silindi: %s", strings.Join(removed, ", ")))
	}

	added, removed = diffSlices(old.GatewayEUIs, new.GatewayEUIs)
	if len(added) > 0 {
		changes = append(changes, fmt.Sprintf("Yeni gateway eklendi: %s", strings.Join(added, ", ")))
	}
	if len(removed) > 0 {
		changes = append(changes, fmt.Sprintf("Gateway silindi: %s", strings.Join(removed, ", ")))
	}

	added, removed = diffSlices(old.DeviceProfileIDs, new.DeviceProfileIDs)
	if len(added) > 0 {
		changes = append(changes, fmt.Sprintf("Yeni device profile eklendi (%d adet)", len(added)))
	}
	if len(removed) > 0 {
		changes = append(changes, fmt.Sprintf("Device profile silindi (%d adet)", len(removed)))
	}

	added, removed = diffSlices(old.ApplicationIDs, new.ApplicationIDs)
	if len(added) > 0 {
		changes = append(changes, fmt.Sprintf("Yeni uygulama eklendi (%d adet)", len(added)))
	}
	if len(removed) > 0 {
		changes = append(changes, fmt.Sprintf("Uygulama silindi (%d adet)", len(removed)))
	}

	added, removed = diffSlices(old.DeviceEUIs, new.DeviceEUIs)
	if len(added) > 0 {
		changes = append(changes, fmt.Sprintf("Yeni cihaz eklendi (%d adet)", len(added)))
	}
	if len(removed) > 0 {
		changes = append(changes, fmt.Sprintf("Cihaz silindi (%d adet)", len(removed)))
	}

	return changes
}

// diffSlices returns elements added to and removed from a sorted slice.
func diffSlices(old, new []string) (added, removed []string) {
	oldSet := make(map[string]struct{}, len(old))
	newSet := make(map[string]struct{}, len(new))
	for _, v := range old {
		oldSet[v] = struct{}{}
	}
	for _, v := range new {
		newSet[v] = struct{}{}
	}
	for v := range newSet {
		if _, ok := oldSet[v]; !ok {
			added = append(added, v)
		}
	}
	for v := range oldSet {
		if _, ok := newSet[v]; !ok {
			removed = append(removed, v)
		}
	}
	return
}

// ---- SSE broadcast for topology changes ----

// sseTopologyClients holds active SSE client channels for topology-change events.
var sseTopologyClients = struct {
	mu      sync.Mutex
	clients map[chan string]struct{}
}{clients: make(map[chan string]struct{})}

// broadcastTopologyChange pushes a JSON message to all connected SSE clients.
func broadcastTopologyChange(changes []string) {
	payload, _ := json.Marshal(map[string]interface{}{
		"type":    "topology_change",
		"changes": changes,
	})
	msg := string(payload)

	sseTopologyClients.mu.Lock()
	defer sseTopologyClients.mu.Unlock()
	for ch := range sseTopologyClients.clients {
		select {
		case ch <- msg:
		default:
			// non-blocking: slow/disconnected client — skip
		}
	}
}

// handleTopologyEvents streams topology-change notifications via SSE.
func handleTopologyEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "streaming not supported"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := make(chan string, 8)
	sseTopologyClients.mu.Lock()
	sseTopologyClients.clients[ch] = struct{}{}
	sseTopologyClients.mu.Unlock()

	defer func() {
		sseTopologyClients.mu.Lock()
		delete(sseTopologyClients.clients, ch)
		sseTopologyClients.mu.Unlock()
		close(ch)
	}()

	// Send an initial keep-alive comment
	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	keepAlive := time.NewTicker(25 * time.Second)
	defer keepAlive.Stop()

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-keepAlive.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
