/**
 * passive-sync.js
 * Handles passive mode topology sync:
 *  - SSE listener for real-time topology-change events
 *  - Manual sync trigger
 *  - Restart-or-dismiss dialog logic
 */
import { state } from "./state.js";
import { api } from "./api.js";
import { showToast, logEntry, $ } from "./utils.js";
import { t } from "./translate.js";
import { applyPassiveModeUI } from "./passive-mode-ui.js";

let sseSource = null;

/**
 * Connects to the SSE topology-change event stream.
 * Automatically reconnects on close while passive mode is active.
 */
export function connectTopologyEvents() {
    if (sseSource) return; // already connected

    sseSource = new EventSource("/api/passive-sync/events");

    sseSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "topology_change" && Array.isArray(data.changes)) {
                onTopologyChange(data.changes);
            }
        } catch (_) {
            // ignore malformed messages
        }
    };

    sseSource.onerror = () => {
        sseSource.close();
        sseSource = null;
        // Reconnect after 30s if still in passive mode
        if (state.passiveMode) {
            setTimeout(connectTopologyEvents, 30000);
        }
    };
}

/**
 * Disconnects from the SSE stream.
 */
export function disconnectTopologyEvents() {
    if (sseSource) {
        sseSource.close();
        sseSource = null;
    }
}

/**
 * Triggers an immediate manual sync via POST /api/passive-sync/trigger.
 */
export async function triggerManualSync() {
    const btn = document.getElementById("btn-manual-sync");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t("syncing") || "Senkronize ediliyor..."}`;
    }

    const r = await api("POST", "/api/passive-sync/trigger");

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-sync"></i> ${t("btn_manual_sync") || "Şimdi Senkronize Et"}`;
    }

    if (r.ok) {
        showToast(t("sync_triggered") || "Senkronizasyon tetiklendi.", "success");
        logEntry("Passive sync: manual trigger sent.", "info");
        // Refresh sync status after a short delay
        setTimeout(refreshSyncStatus, 2000);
    } else {
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        showToast(t("sync_failed") || "Senkronizasyon başarısız: " + err, "error");
    }
}

/**
 * Fetches and updates the sync status label in the UI.
 */
export async function refreshSyncStatus() {
    const r = await api("GET", "/api/passive-sync/status");
    if (!r.ok) return;

    const { last_sync_at, pending_changes, changes_summary } = r.data;

    const label = document.getElementById("last-sync-label");
    if (label) {
        if (last_sync_at) {
            const d = new Date(last_sync_at);
            label.textContent = `${t("last_sync_at") || "Son Senkronizasyon:"} ${d.toLocaleTimeString()}`;
        } else {
            label.textContent = t("sync_never") || "Son Senkronizasyon: —";
        }
    }

    state.pendingTopologyChange = pending_changes;
    state.changesSummary = changes_summary || [];

    if (pending_changes && changes_summary && changes_summary.length > 0) {
        onTopologyChange(changes_summary);
    }
}

/**
 * Loads the current passive mode config from backend and applies UI.
 */
export async function loadPassiveModeConfig() {
    const r = await api("GET", "/api/passive-mode");
    if (!r.ok) return;

    const { enabled, sync_interval_minutes, last_sync_at, pending_changes, changes_summary } = r.data;

    state.passiveMode = enabled;
    state.syncIntervalMinutes = sync_interval_minutes || 5;
    state.lastSyncAt = last_sync_at || null;
    state.pendingTopologyChange = pending_changes || false;
    state.changesSummary = changes_summary || [];

    // Sync the toggle in settings
    const toggle = document.getElementById("passive-mode-toggle");
    if (toggle) toggle.checked = enabled;

    const intervalInput = document.getElementById("sync-interval");
    if (intervalInput) intervalInput.value = sync_interval_minutes || 5;

    // Apply UI state globally
    applyPassiveModeUI(enabled);

    // Connect SSE if needed
    if (enabled) {
        connectTopologyEvents();
    }

    // Show pending change modal if there are pending changes on load
    if (pending_changes && changes_summary && changes_summary.length > 0) {
        onTopologyChange(changes_summary);
    }
}

/**
 * Called when a topology change is detected (SSE or polling).
 * If simulation is running → shows the restart modal.
 * If simulation is NOT running → automatically re-syncs.
 * @param {string[]} changes
 */
function onTopologyChange(changes) {
    const isRunning = state.currentStatus === "running" || state.currentStatus === "starting";

    logEntry(`[Pasif Senkronizasyon] Topoloji değişikliği: ${changes.join("; ")}`, "warn");

    if (isRunning) {
        // Show modal asking user to restart
        showTopologyChangeModal(changes);
    } else {
        // Auto-dismiss and show info toast (no simulation running, nothing to restart)
        dismissChanges();
        showToast(
            `${t("topology_changed") || "Topoloji güncellendi"}: ${changes.slice(0, 2).join(", ")}${changes.length > 2 ? "..." : ""}`,
            "info"
        );
        refreshSyncStatus();
    }
}

/**
 * Shows the topology change modal with the list of changes.
 * @param {string[]} changes
 */
function showTopologyChangeModal(changes) {
    const modal = document.getElementById("modal-topology-change");
    const summary = document.getElementById("topology-change-summary");

    if (!modal) return;

    if (summary) {
        const ul = document.createElement("ul");
        ul.style.cssText = "margin:8px 0 0 16px; padding:0; list-style:disc;";
        changes.forEach((c) => {
            const li = document.createElement("li");
            li.textContent = c;
            ul.appendChild(li);
        });
        summary.innerHTML = "";
        summary.appendChild(ul);
    }

    modal.style.display = "flex";

    // Wire restart button
    const btnRestart = document.getElementById("btn-restart-after-sync");
    if (btnRestart) {
        btnRestart.onclick = async () => {
            modal.style.display = "none";
            await dismissChanges();
            // Trigger stop then re-start via existing API
            await api("POST", "/api/stop");
            await new Promise((r) => setTimeout(r, 1500));
            // Re-use the current active config (already stored)
            const statusR = await api("GET", "/api/status");
            if (statusR.ok && statusR.data.config) {
                await api("POST", "/api/start", statusR.data.config);
                showToast(t("sim_restarted") || "Simülasyon yeniden başlatıldı.", "success");
                logEntry("Passive sync: simulation restarted after topology change.", "success");
            }
        };
    }

    // Wire dismiss button
    const btnDismiss = document.getElementById("btn-dismiss-topology-change");
    if (btnDismiss) {
        btnDismiss.onclick = async () => {
            modal.style.display = "none";
            await dismissChanges();
        };
    }
}

/**
 * POSTs to dismiss pending changes flag in backend.
 */
async function dismissChanges() {
    state.pendingTopologyChange = false;
    state.changesSummary = [];
    await api("POST", "/api/passive-sync/dismiss");
    refreshSyncStatus();
}
