import { state } from "../state.js";
import { $, $$, escapeHtml } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

export async function fetchSimulationDevices() {
    const r = await api("GET", "/api/simulation/devices");
    if (r.ok && r.data && r.data.devices) {
        state.devStatusList = r.data.devices;
        populateStatusFilters();
        applyDevStatusFiltersAndRender();
    }
}

export function applyDevStatusFiltersAndRender() {
    const q = (state.devStatusSearchQuery || "").toLowerCase();
    const orgSelect = document.getElementById("dev-status-org-select");
    const appSelect = document.getElementById("dev-status-app-select");
    const orgFilter = orgSelect ? orgSelect.value : "";
    const appFilter = appSelect ? appSelect.value : "";

    state.devStatusFiltered = state.devStatusList.filter((d) => {
        // 1. Search Query Filter
        const matchesSearch = !q ||
            (d.device_name && d.device_name.toLowerCase().indexOf(q) !== -1) ||
            (d.dev_eui && d.dev_eui.toLowerCase().indexOf(q) !== -1) ||
            (d.app_name && d.app_name.toLowerCase().indexOf(q) !== -1);
        if (!matchesSearch) return false;

        // 2. Use direct tenant/application mapping returned from backend
        const finalTenantId = d.tenant_id;
        const finalAppId = d.application_id;

        // 3. Org Filter
        if (orgFilter) {
            if (finalTenantId !== orgFilter) return false;
        }

        // 4. App Filter
        if (appFilter) {
            if (finalAppId !== appFilter) return false;
        }

        return true;
    });

    const sk = state.devStatusSort.key;
    const sd = state.devStatusSort.dir === "asc" ? 1 : -1;
    state.devStatusFiltered.sort((a, b) => {
        const va = a[sk];
        const vb = b[sk];
        if (typeof va === "number" && typeof vb === "number") {
            return (va - vb) * sd;
        }
        const vaStr = (va || "").toString().toLowerCase();
        const vbStr = (vb || "").toString().toLowerCase();
        if (vaStr < vbStr) return -1 * sd;
        if (vaStr > vbStr) return 1 * sd;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(state.devStatusFiltered.length / state.devStatusPageSize));
    if (state.devStatusPage > totalPages) state.devStatusPage = totalPages;

    renderDevStatusTable();
    renderDevStatusPagination();
    renderDevStatusTotalCount();
    updateDevStatusSortIcons();
}

export function renderDevStatusTable() {
    const tbody = document.getElementById("dev-status-table-body");
    const empty = document.getElementById("dev-status-empty-state");
    if (!tbody || !empty) return;

    tbody.innerHTML = "";
    if (state.devStatusFiltered.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    const start = (state.devStatusPage - 1) * state.devStatusPageSize;
    const end = Math.min(start + state.devStatusPageSize, state.devStatusFiltered.length);
    const pageItems = state.devStatusFiltered.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const d = pageItems[i];
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        const stateClass = d.state === "Activated" ? "activated" : "otaa";
        const stateLabel = d.state === "Activated" ? "AKTİF" : "OTAA";
        
        let anomalyBadgeHtml = "—";
        if (d.active_anomaly) {
            anomalyBadgeHtml = `<span class="status-pill otaa" style="background:rgba(255, 123, 48, 0.15); color:var(--warning); border:1px solid var(--warning);">${escapeHtml(d.active_anomaly.toUpperCase())}</span>`;
        }
        
        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(d.device_name)}</span></td>` +
            `<td><span class="id-cell">${escapeHtml(d.dev_eui)}</span></td>` +
            `<td><span class="org-name-secondary">${escapeHtml(d.app_name)}</span></td>` +
            `<td><span class="status-pill ${stateClass}">${stateLabel}</span></td>` +
            `<td><span class="org-name-primary">${d.uplink_count}</span></td>` +
            `<td>${anomalyBadgeHtml}</td>`;
            
        tr.addEventListener("click", () => {
            openDeviceStatusDrawer(d);
        });
        tbody.appendChild(tr);
    }
}

export function openDeviceStatusDrawer(d) {
    const activeAnomalyText = d.active_anomaly || (state.language === "tr" ? "Yok" : "None");
    const isFlatline = d.active_anomaly && d.active_anomaly.includes("flatline");
    const isDrift = d.active_anomaly && d.active_anomaly.includes("drift");
    
    // Import dynamically to avoid circular dependency
    import("../utils.js").then((utils) => {
        const htmlContent = `
            <div class="device-details-pane" style="display:flex; flex-direction:column; gap:16px;">
                <table class="details-table" style="width:100%; border-collapse: collapse;">
                    <tbody>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><th style="text-align:left; padding:8px 0; color:var(--text-dim);">DevEUI:</th><td class="id-cell" style="padding:8px 0; text-align:right;">${escapeHtml(d.dev_eui)}</td></tr>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><th style="text-align:left; padding:8px 0; color:var(--text-dim);">Cihaz Adı:</th><td style="padding:8px 0; text-align:right;">${escapeHtml(d.device_name)}</td></tr>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><th style="text-align:left; padding:8px 0; color:var(--text-dim);">Ağ Adı:</th><td style="padding:8px 0; text-align:right;">${escapeHtml(d.app_name)}</td></tr>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><th style="text-align:left; padding:8px 0; color:var(--text-dim);">Durum:</th><td style="padding:8px 0; text-align:right;"><span class="status-pill ${d.state === "Activated" ? "activated" : "otaa"}">${d.state === "Activated" ? "AKTİF" : "OTAA"}</span></td></tr>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><th style="text-align:left; padding:8px 0; color:var(--text-dim);">Paket Sayısı:</th><td style="padding:8px 0; text-align:right;">${d.uplink_count}</td></tr>
                        <tr><th style="text-align:left; padding:8px 0; color:var(--text-dim);">Aktif Anomali:</th><td style="padding:8px 0; text-align:right; font-weight:bold; color:var(--warning);">${escapeHtml(activeAnomalyText.toUpperCase())}</td></tr>
                    </tbody>
                </table>
                
                <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:16px;">
                    <h3 style="font-size:0.85rem; font-weight:600; color:var(--text-dim); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;" data-i18n="anomaly_types">Manuel Hata Enjeksiyonu</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <button class="btn btn-secondary btn-sm" id="btn-manual-spike" style="justify-content:center;">
                            ⚡ Spike Tetikle
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-manual-dropout" style="justify-content:center;">
                            🕳️ Dropout Tetikle
                        </button>
                        <button class="btn ${isFlatline ? 'btn-danger' : 'btn-secondary'} btn-sm" id="btn-manual-flatline" style="justify-content:center;">
                            ❄️ ${isFlatline ? "Donmayı Durdur" : "Flatline Başlat"}
                        </button>
                        <button class="btn ${isDrift ? 'btn-danger' : 'btn-secondary'} btn-sm" id="btn-manual-drift" style="justify-content:center;">
                            📉 ${isDrift ? "Sapmayı Durdur" : "Drift Başlat"}
                        </button>
                    </div>
                </div>
            </div>
        `;

        utils.openDetailsDrawer(
            state.language === "tr" ? "Cihaz Durumu & Anomali" : "Device Status & Anomaly",
            state.language === "tr" ? "Hata enjeksiyonu ve detay izleme" : "Error injection and details view",
            htmlContent
        );

        // Bind click events
        const btnSpike = document.getElementById("btn-manual-spike");
        const btnDropout = document.getElementById("btn-manual-dropout");
        const btnFlatline = document.getElementById("btn-manual-flatline");
        const btnDrift = document.getElementById("btn-manual-drift");

        if (btnSpike) btnSpike.addEventListener("click", () => sendAnomalyCommand(d.dev_eui, "spike", "trigger"));
        if (btnDropout) btnDropout.addEventListener("click", () => sendAnomalyCommand(d.dev_eui, "dropout", "trigger"));
        
        if (btnFlatline) {
            btnFlatline.addEventListener("click", () => {
                const action = isFlatline ? "stop" : "start";
                sendAnomalyCommand(d.dev_eui, "flatline", action);
            });
        }
        if (btnDrift) {
            btnDrift.addEventListener("click", () => {
                const action = isDrift ? "stop" : "start";
                sendAnomalyCommand(d.dev_eui, "drift", action);
            });
        }
    });
}

export async function sendAnomalyCommand(devEUI, type, action) {
    const r = await api("POST", `/api/devices/${devEUI}/anomaly`, { type, action });
    
    // Import utils dynamically
    import("../utils.js").then((utils) => {
        if (r.ok) {
            utils.showToast(state.language === "tr" ? "Hata enjeksiyon komutu uygulandı." : "Anomaly command applied successfully.", "success");
            utils.closeDetailsDrawer();
            fetchSimulationDevices();
        } else {
            const errMsg = (r.data && r.data.error) || "Hata oluştu";
            utils.showToast(errMsg, "error");
        }
    });
}

export function renderDevStatusPagination() {
    const el = document.getElementById("dev-status-pagination");
    if (!el) return;
    el.innerHTML = "";
    const total = state.devStatusFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.devStatusPageSize));
    const current = state.devStatusPage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToDevStatusPage(current - 1); });
    el.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToDevStatusPage(pageNum); };
        })(p));
        el.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToDevStatusPage(current + 1); });
    el.appendChild(nextBtn);
}

export function renderDevStatusTotalCount() {
    const el = document.getElementById("dev-status-total-count");
    if (!el) return;
    el.innerHTML = t("footer_total_dev").replace("{count}", state.devStatusFiltered.length);
}

export function updateDevStatusSortIcons() {
    const allIcons = document.querySelectorAll("[id^='dev-status-sort-icon-']");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }
    const icon = document.getElementById("dev-status-sort-icon-" + state.devStatusSort.key);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = state.devStatusSort.dir === "asc" ? "▲" : "▼";
    }
}

export function goToDevStatusPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.devStatusFiltered.length / state.devStatusPageSize));
    if (n < 1 || n > totalPages) return;
    state.devStatusPage = n;
    applyDevStatusFiltersAndRender();
}

export function populateStatusFilters() {
    const orgSelect = document.getElementById("dev-status-org-select");
    const appSelect = document.getElementById("dev-status-app-select");
    if (!orgSelect || !appSelect) return;

    // Save current selection to restore if possible
    const prevOrg = orgSelect.value;
    const prevApp = appSelect.value;

    orgSelect.innerHTML = `<option value="">${state.language === "tr" ? "Tüm Organizasyonlar" : "All Organizations"}</option>`;
    appSelect.innerHTML = `<option value="">${state.language === "tr" ? "Tüm Ağlar" : "All Networks"}</option>`;

    // Populate Orgs
    (state.organizations || []).forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        if (org.id === prevOrg) opt.selected = true;
        orgSelect.appendChild(opt);
    });

    const selectedOrgId = orgSelect.value;
    const filteredApps = selectedOrgId
        ? (state.applications || []).filter(app => app.tenant_id === selectedOrgId)
        : (state.applications || []);

    // Populate Apps
    filteredApps.forEach((app) => {
        const opt = document.createElement("option");
        opt.value = app.id;
        opt.textContent = app.name;
        if (app.id === prevApp) opt.selected = true;
        appSelect.appendChild(opt);
    });
}

export function initDeviceStatusTab() {
    const devStatusSearchInput = $("#dev-status-search-input");
    const btnDevStatusRefresh = $("#btn-dev-status-refresh");
    const devStatusPageSizeSelect = $("#dev-status-page-size-select");
    const orgSelect = document.getElementById("dev-status-org-select");
    const appSelect = document.getElementById("dev-status-app-select");

    if (devStatusSearchInput) {
        devStatusSearchInput.addEventListener("input", (e) => {
            state.devStatusSearchQuery = e.target.value;
            state.devStatusPage = 1;
            applyDevStatusFiltersAndRender();
        });
    }
    if (btnDevStatusRefresh) {
        btnDevStatusRefresh.addEventListener("click", () => {
            fetchSimulationDevices();
        });
    }
    if (devStatusPageSizeSelect) {
        devStatusPageSizeSelect.addEventListener("change", (e) => {
            state.devStatusPageSize = parseInt(e.target.value, 10) || 5;
            state.devStatusPage = 1;
            applyDevStatusFiltersAndRender();
        });
    }

    if (orgSelect) {
        orgSelect.addEventListener("change", (e) => {
            if (appSelect) appSelect.value = "";
            state.devStatusOrgFilter = e.target.value;
            state.devStatusAppFilter = ""; // Reset app filter when org changes
            state.devStatusPage = 1;
            populateStatusFilters(); // update app options
            applyDevStatusFiltersAndRender();
        });
    }

    if (appSelect) {
        appSelect.addEventListener("change", (e) => {
            state.devStatusAppFilter = e.target.value;
            state.devStatusPage = 1;
            applyDevStatusFiltersAndRender();
        });
    }

    const headers = document.querySelectorAll("#dev-status-table thead th.sortable");
    headers.forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort");
            if (state.devStatusSort.key === key) {
                state.devStatusSort.dir = state.devStatusSort.dir === "asc" ? "desc" : "asc";
            } else {
                state.devStatusSort.key = key;
                state.devStatusSort.dir = "asc";
            }
            state.devStatusPage = 1;
            applyDevStatusFiltersAndRender();
        });
    });

    populateStatusFilters();
}
