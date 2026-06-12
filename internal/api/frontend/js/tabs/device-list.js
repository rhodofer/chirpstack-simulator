import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry, openDetailsDrawer, closeDetailsDrawer } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { getOrgName, applyFiltersAndRender as applyOrgFiltersAndRender } from "./orgs.js";
import { findDp } from "./devices.js";
import { findNet } from "./networks.js";
import { updateMap } from "./dashboard.js";

export function findDev(devEui) {
    return state.devList.find(dev => dev.dev_eui === devEui);
}

export function getDpName(dpId) {
    if (!dpId) return "—";
    const dp = findDp(dpId);
    return dp ? dp.name : dpId;
}

export async function fetchDevices(tenantId) {
    let url = "/api/devices";
    if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
    const r = await api("GET", url);
    if (r.ok && r.data.devices) {
        state.devList = r.data.devices;
    } else {
        state.devList = [];
        const errMsg = (r.data && r.data.error) || "Bağlantı hatası";
        logEntry("Failed to load devices: " + errMsg, "error");
    }
    applyDevFiltersAndRender();
    updateMap();
    applyOrgFiltersAndRender();
}

export async function createDevice(data) {
    const r = await api("POST", "/api/devices", data);
    if (r.ok) {
        const dev = r.data;
        logEntry("New device created: " + dev.name + " (EUI: " + dev.dev_eui + ")", "success");
        showToast("'" + dev.name + "' cihazı oluşturuldu.", "success");
        await fetchDevices(state.devTenantFilter);
        return true;
    } else {
        const errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to create device: " + errMsg, "error");
        showToast(errMsg, "error");
        return false;
    }
}

export async function deleteDevice(devEui) {
    const dev = findDev(devEui);
    if (!dev) return;
    if (!confirm("'" + dev.name + "' cihazını silmek istediğinize emin misiniz?")) return;
    const r = await api("DELETE", "/api/devices/" + devEui);
    if (r.ok) {
        logEntry("Device deleted: " + dev.name, "success");
        showToast("'" + dev.name + "' silindi.", "success");
        await fetchDevices(state.devTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || "Silme hatası";
        logEntry("Failed to delete device: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function lockUI(msg) {
    const overlay = document.getElementById("loading-lock-overlay");
    const message = document.getElementById("loading-lock-message");
    if (overlay) overlay.style.display = "flex";
    if (message) message.textContent = msg;
}

export function unlockUI() {
    const overlay = document.getElementById("loading-lock-overlay");
    if (overlay) overlay.style.display = "none";
}

export async function updateDeviceInterval(devEui, interval) {
    lockUI("Gönderim sıklığı kaydediliyor...");
    const r = await api("POST", "/api/device-intervals", { dev_eui: devEui, interval: interval });
    if (!r.ok) {
        showToast("Güncelleme başarısız: " + ((r.data && r.data.error) || "Hata"), "error");
        unlockUI();
        fetchDeviceIntervals();
        return;
    }
    state.deviceIntervals[devEui] = interval;

    lockUI("Simülatör durumu kontrol ediliyor...");
    const statusRes = await api("GET", "/api/status");
    if (!statusRes.ok) {
        showToast("Simülatör durumu alınamadı.", "error");
        unlockUI();
        applyDevFiltersAndRender();
        return;
    }

    const simStatus = statusRes.data.status;
    const simConfig = statusRes.data.config;

    if (simStatus === "running" || simStatus === "starting") {
        lockUI("Simülatör durduruluyor...");
        const stopRes = await api("POST", "/api/stop");
        if (!stopRes.ok) {
            showToast("Simülatör durdurulamadı: " + ((stopRes.data && stopRes.data.error) || ""), "error");
            unlockUI();
            applyDevFiltersAndRender();
            return;
        }

        let isStopped = false;
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const pollRes = await api("GET", "/api/status");
            if (pollRes.ok && pollRes.data.status === "idle") {
                isStopped = true;
                break;
            }
        }

        if (!isStopped) {
            showToast("Simülatör durdurulurken zaman aşımı oluştu.", "error");
            unlockUI();
            applyDevFiltersAndRender();
            return;
        }

        showToast("Simülatör durduruldu", "info");
        logEntry("Simulator stopped.", "info");

        await new Promise(resolve => setTimeout(resolve, 1000));

        lockUI("Simülatör yeniden başlatılıyor...");
        if (simConfig) {
            const startRes = await api("POST", "/api/start", simConfig);
            if (startRes.ok) {
                showToast("Simülatör yeniden başlatıldı", "success");
                logEntry("Simulator restarted.", "success");
            } else {
                showToast("Simülatör başlatılamadı: " + ((startRes.data && startRes.data.error) || ""), "error");
            }
        } else {
            showToast("Başlatma konfigürasyonu bulunamadı.", "error");
        }
    } else {
        showToast("Gönderim sıklığı güncellendi.", "success");
    }

    unlockUI();
    applyDevFiltersAndRender();
}

export function getDeviceIntervalText(devEui) {
    const val = state.deviceIntervals[devEui] || "2m";
    const mapping = {
        "1m": "1 dk",
        "2m": "2 dk",
        "4m": "4 dk",
        "5m": "5 dk",
        "10m": "10 dk"
    };
    return mapping[val] || val;
}

export async function fetchDeviceIntervals() {
    const r = await api("GET", "/api/device-intervals");
    if (r.ok && r.data.intervals) {
        state.deviceIntervals = r.data.intervals;
    } else {
        state.deviceIntervals = {};
    }
    applyDevIntFiltersAndRender();
}

export function applyDevFiltersAndRender() {
    const q = state.devSearchQuery.toLowerCase();
    const tFilter = state.devTenantFilter;

    let filtered = state.devList;
    if (tFilter) {
        filtered = filtered.filter(dev => dev.tenant_id === tFilter);
    }

    if (q) {
        state.devFiltered = filtered.filter((dev) => {
            return (dev.name && dev.name.toLowerCase().indexOf(q) !== -1) ||
                   (dev.dev_eui && dev.dev_eui.toLowerCase().indexOf(q) !== -1);
        });
    } else {
        state.devFiltered = filtered.slice();
    }

    const sk = state.devSort.key;
    const sd = state.devSort.dir === "asc" ? 1 : -1;
    state.devFiltered.sort((a, b) => {
        let va = a[sk];
        let vb = b[sk];
        if (sk === "tenant_id") {
            va = getOrgName(va);
            vb = getOrgName(vb);
        }
        if (sk === "device_profile_id") {
            va = getDpName(va);
            vb = getDpName(vb);
        }
        const vaStr = (va || "").toString().toLowerCase();
        const vbStr = (vb || "").toString().toLowerCase();
        if (vaStr < vbStr) return -1 * sd;
        if (vaStr > vbStr) return 1 * sd;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(state.devFiltered.length / state.devPageSize));
    if (state.devPage > totalPages) state.devPage = totalPages;
    
    renderDevTable();
    renderDevPagination();
    renderDevTotalCount();
    updateDevSortIcons();

    // Also sync the intervals tab table as they share devList
    applyDevIntFiltersAndRender();
}

export function renderDevTable() {
    const devTableBody = $("#dev-table-body");
    const devEmptyState = $("#dev-empty-state");
    if (!devTableBody) return;
    devTableBody.innerHTML = "";

    if (state.devFiltered.length === 0) {
        if (devEmptyState) devEmptyState.style.display = "block";
        return;
    }
    if (devEmptyState) devEmptyState.style.display = "none";

    const start = (state.devPage - 1) * state.devPageSize;
    const end = Math.min(start + state.devPageSize, state.devFiltered.length);
    const pageItems = state.devFiltered.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const dev = pageItems[i];
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", dev.dev_eui);
        
        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(dev.name)}</span></td>` +
            `<td><span class="org-name-primary">${escapeHtml(getOrgName(dev.tenant_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(dev.tenant_id || "—")}</span></td>` +
            `<td><span class="id-cell">${escapeHtml(dev.dev_eui)}</span></td>` +
            `<td><span class="org-name-primary">${escapeHtml(getDpName(dev.device_profile_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(dev.device_profile_id || "—")}</span></td>` +
            `<td>` +
                `<select class="page-size-select dev-table-interval-select" data-id="${dev.dev_eui}" style="font-size: 11px; padding: 2px 6px; background: rgba(0, 255, 135, 0.05); color: var(--green); border: 1px solid rgba(0, 255, 135, 0.2); border-radius: var(--radius-xs); cursor: pointer; max-width: 100px;">` +
                    `<option value="1m"${((state.deviceIntervals[dev.dev_eui] || "2m") === "1m" ? " selected" : "")}>${state.language === "tr" ? "1 dk" : "1 min"}</option>` +
                    `<option value="2m"${((state.deviceIntervals[dev.dev_eui] || "2m") === "2m" ? " selected" : "")}>${state.language === "tr" ? "2 dk" : "2 min"}</option>` +
                    `<option value="4m"${((state.deviceIntervals[dev.dev_eui] || "2m") === "4m" ? " selected" : "")}>${state.language === "tr" ? "4 dk" : "4 min"}</option>` +
                    `<option value="5m"${((state.deviceIntervals[dev.dev_eui] || "2m") === "5m" ? " selected" : "")}>${state.language === "tr" ? "5 dk" : "5 min"}</option>` +
                    `<option value="10m"${((state.deviceIntervals[dev.dev_eui] || "2m") === "10m" ? " selected" : "")}>${state.language === "tr" ? "10 dk" : "10 min"}</option>` +
                `</select>` +
            `</td>` +
            `<td>` +
                `<div class="row-actions">` +
                    `<button class="row-action-btn view-btn" data-id="${dev.dev_eui}" title="Görüntüle">👁</button>` +
                    `<button class="row-action-btn edit-btn" data-id="${dev.dev_eui}" title="Düzenle">✏</button>` +
                    `<button class="row-action-btn danger delete-btn" data-id="${dev.dev_eui}" title="Sil">🗑</button>` +
                `</div>` +
            `</td>`;

        tr.addEventListener("click", ((devEui) => {
            return (e) => {
                if (e.target.closest(".delete-btn")) {
                    e.stopPropagation();
                    deleteDevice(devEui);
                    return;
                }
                if (e.target.closest(".edit-btn")) {
                    e.stopPropagation();
                    openDevDrawer(devEui);
                    return;
                }
                if (e.target.closest(".view-btn")) {
                    e.stopPropagation();
                    viewDevice(devEui);
                    return;
                }
            };
        })(dev.dev_eui));

        const intervalSelect = tr.querySelector(".dev-table-interval-select");
        if (intervalSelect) {
            intervalSelect.addEventListener("change", function () {
                const devEuiVal = this.getAttribute("data-id");
                const val = this.value;
                updateDeviceInterval(devEuiVal, val);
            });
        }

        devTableBody.appendChild(tr);
    }
}

export function renderDevPagination() {
    const devPaginationEl = $("#dev-pagination");
    if (!devPaginationEl) return;
    devPaginationEl.innerHTML = "";
    const total = state.devFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.devPageSize));
    const current = state.devPage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToDevPage(current - 1); });
    devPaginationEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToDevPage(pageNum); };
        })(p));
        devPaginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToDevPage(current + 1); });
    devPaginationEl.appendChild(nextBtn);
}

export function renderDevTotalCount() {
    const devTotalCountEl = $("#dev-total-count");
    if (devTotalCountEl) {
        devTotalCountEl.innerHTML = t("footer_total_dev").replace("{count}", state.devFiltered.length);
    }
}

export function updateDevSortIcons() {
    const allIcons = $$("[id^='dev-sort-icon-']");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }
    const icon = $("#dev-sort-icon-" + state.devSort.key);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = state.devSort.dir === "asc" ? "▲" : "▼";
    }
}

export function goToDevPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.devFiltered.length / state.devPageSize));
    if (n < 1 || n > totalPages) return;
    state.devPage = n;
    applyDevFiltersAndRender();
}

export function sortDevBy(key) {
    if (state.devSort.key === key) {
        state.devSort.dir = state.devSort.dir === "asc" ? "desc" : "asc";
    } else {
        state.devSort.key = key;
        state.devSort.dir = "asc";
    }
    state.devPage = 1;
    applyDevFiltersAndRender();
}

export function searchDev(q) {
    state.devSearchQuery = q;
    state.devPage = 1;
    applyDevFiltersAndRender();
}

export function changeDevPageSize(n) {
    state.devPageSize = parseInt(n, 10) || 5;
    state.devPage = 1;
    applyDevFiltersAndRender();
}

// ─── Device Intervals Tab Functions ───
export function applyDevIntFiltersAndRender() {
    const q = state.devIntSearchQuery.toLowerCase();
    let filtered = state.devList;
    if (q) {
        state.devIntFiltered = filtered.filter((dev) => {
            return (dev.name && dev.name.toLowerCase().indexOf(q) !== -1) ||
                   (dev.dev_eui && dev.dev_eui.toLowerCase().indexOf(q) !== -1);
        });
    } else {
        state.devIntFiltered = filtered.slice();
    }

    const sk = state.devIntSort.key;
    const sd = state.devIntSort.dir === "asc" ? 1 : -1;
    state.devIntFiltered.sort((a, b) => {
        let va = a[sk];
        let vb = b[sk];
        if (sk === "tenant_id") {
            va = getOrgName(va);
            vb = getOrgName(vb);
        }
        const vaStr = (va || "").toString().toLowerCase();
        const vbStr = (vb || "").toString().toLowerCase();
        if (vaStr < vbStr) return -1 * sd;
        if (vaStr > vbStr) return 1 * sd;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(state.devIntFiltered.length / state.devIntPageSize));
    if (state.devIntPage > totalPages) state.devIntPage = totalPages;

    renderDevIntTable();
    renderDevIntPagination();
    renderDevIntTotalCount();
}

export function renderDevIntTable() {
    const devIntTableBody = $("#dev-int-table-body");
    const devIntEmptyState = $("#dev-int-empty-state");
    if (!devIntTableBody) return;
    devIntTableBody.innerHTML = "";

    if (state.devIntFiltered.length === 0) {
        if (devIntEmptyState) devIntEmptyState.style.display = "block";
        return;
    }
    if (devIntEmptyState) devIntEmptyState.style.display = "none";

    const start = (state.devIntPage - 1) * state.devIntPageSize;
    const end = Math.min(start + state.devIntPageSize, state.devIntFiltered.length);
    const pageItems = state.devIntFiltered.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const dev = pageItems[i];
        const currentInterval = state.deviceIntervals[dev.dev_eui] || "2m";
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", dev.dev_eui);
        
        let optionsHtml = "";
        const intervalsList = [
            { val: "1m", label: "1 dk" },
            { val: "2m", label: "2 dk" },
            { val: "4m", label: "4 dk" },
            { val: "5m", label: "5 dk" },
            { val: "10m", label: "10 dk" }
        ];
        for (let k = 0; k < intervalsList.length; k++) {
            const isSelected = (intervalsList[k].val === currentInterval) ? "selected" : "";
            optionsHtml += `<option value="${intervalsList[k].val}" ${isSelected}>${intervalsList[k].label}</option>`;
        }

        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(dev.name)}</span></td>` +
            `<td><span class="org-name-primary">${escapeHtml(getOrgName(dev.tenant_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(dev.tenant_id || "—")}</span></td>` +
            `<td><span class="id-cell">${escapeHtml(dev.dev_eui)}</span></td>` +
            `<td>` +
                `<select class="page-size-select dev-interval-select" style="max-width: 160px;" data-id="${dev.dev_eui}">` +
                    optionsHtml +
                `</select>` +
            `</td>`;
        
        const selectEl = tr.querySelector(".dev-interval-select");
        selectEl.addEventListener("change", function () {
            const devEuiVal = this.getAttribute("data-id");
            const intervalVal = this.value;
            updateDeviceInterval(devEuiVal, intervalVal);
        });

        devIntTableBody.appendChild(tr);
    }
}

export function renderDevIntPagination() {
    const devIntPaginationEl = $("#dev-int-pagination");
    if (!devIntPaginationEl) return;
    devIntPaginationEl.innerHTML = "";
    const total = state.devIntFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.devIntPageSize));
    const current = state.devIntPage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToDevIntPage(current - 1); });
    devIntPaginationEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToDevIntPage(pageNum); };
        })(p));
        devIntPaginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToDevIntPage(current + 1); });
    devIntPaginationEl.appendChild(nextBtn);
}

export function renderDevIntTotalCount() {
    const devIntTotalCountEl = $("#dev-int-total-count");
    if (devIntTotalCountEl) {
        devIntTotalCountEl.innerHTML = t("footer_total_dev").replace("{count}", state.devIntFiltered.length);
    }
}

export function goToDevIntPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.devIntFiltered.length / state.devIntPageSize));
    if (n < 1 || n > totalPages) return;
    state.devIntPage = n;
    applyDevIntFiltersAndRender();
}



export function populateDevFilterTenantSelect() {
    const devTenantFilter = $("#dev-tenant-select");
    if (!devTenantFilter) return;
    const firstOpt = devTenantFilter.querySelector('option[value=""]');
    devTenantFilter.innerHTML = "";
    if (firstOpt) {
        devTenantFilter.appendChild(firstOpt);
    } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Tüm Tenant'lar";
        devTenantFilter.appendChild(opt);
    }
    for (let i = 0; i < state.organizations.length; i++) {
        const opt = document.createElement("option");
        opt.value = state.organizations[i].id;
        opt.textContent = state.organizations[i].name;
        devTenantFilter.appendChild(opt);
    }
}



export function generateRandomDevEUI() {
    const hex = "0123456789abcdef";
    let res = "";
    for (let i = 0; i < 16; i++) {
        res += hex.charAt(Math.floor(Math.random() * 16));
    }
    return res;
}

export function populateDevEditAppSelect(selectedAppId) {
    const devEditApp = $("#dev_edit_app");
    if (!devEditApp) return;
    devEditApp.innerHTML = "";
    if (state.applications.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Önce ağ oluşturun" : "Create a network first";
        opt.disabled = true;
        devEditApp.appendChild(opt);
        return;
    }
    for (let i = 0; i < state.applications.length; i++) {
        const opt = document.createElement("option");
        opt.value = state.applications[i].id;
        opt.textContent = state.applications[i].name;
        devEditApp.appendChild(opt);
    }
    if (selectedAppId) {
        devEditApp.value = selectedAppId;
    }
}

export function onDevEditAppChange(selectedDpId) {
    const devEditApp = $("#dev_edit_app");
    const devEditProfile = $("#dev_edit_profile");
    if (!devEditApp || !devEditProfile) return;

    const appId = devEditApp.value;
    devEditProfile.innerHTML = "";
    const app = findNet(appId);
    if (!app) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Ağ bulunamadı" : "Network not found";
        opt.disabled = true;
        devEditProfile.appendChild(opt);
        return;
    }
    const tenantId = app.tenant_id;
    const filteredDps = state.dpList.filter(dp => dp.tenant_id === tenantId);

    if (filteredDps.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Bu tenant için device profile yok";
        opt.disabled = true;
        devEditProfile.appendChild(opt);
        return;
    }

    for (let i = 0; i < filteredDps.length; i++) {
        const opt = document.createElement("option");
        opt.value = filteredDps[i].id;
        opt.textContent = filteredDps[i].name;
        devEditProfile.appendChild(opt);
    }
    if (selectedDpId) {
        devEditProfile.value = selectedDpId;
    }
}

export async function openDevDrawer(devEui) {
    const r = await api("GET", "/api/devices/" + devEui);
    if (!r.ok) {
        showToast(state.language === "tr" ? "Cihaz detayları yüklenemedi" : "Failed to load device details", "error");
        return;
    }
    const dev = r.data;

    state.activeDevEui = devEui;

    const devEditName = $("#dev_edit_name");
    const devEditEui = $("#dev_edit_eui");
    const devEditDescription = $("#dev_edit_description");
    const devEditIsDisabled = $("#dev_edit_is_disabled");

    if (devEditName) devEditName.value = dev.name || "";
    if (devEditEui) devEditEui.value = dev.dev_eui || "";
    if (devEditDescription) devEditDescription.value = dev.description || "";
    if (devEditIsDisabled) devEditIsDisabled.checked = !!dev.is_disabled;

    populateDevEditAppSelect(dev.application_id);
    onDevEditAppChange(dev.device_profile_id);

    const drawer = $("#dev-drawer");
    const overlay = $("#dev-drawer-overlay");
    if (drawer) drawer.classList.add("open");
    if (overlay) overlay.classList.add("open");

    logEntry("Device selected for edit: " + dev.name, "info");
}

export function closeDevDrawer() {
    const drawer = $("#dev-drawer");
    const overlay = $("#dev-drawer-overlay");
    if (drawer) drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    state.activeDevEui = null;
}

export async function saveDevice() {
    const devEui = state.activeDevEui;
    if (!devEui) return;

    const devEditName = $("#dev_edit_name");
    const devEditApp = $("#dev_edit_app");
    const devEditProfile = $("#dev_edit_profile");
    const devEditDescription = $("#dev_edit_description");
    const devEditIsDisabled = $("#dev_edit_is_disabled");

    const name = devEditName ? devEditName.value.trim() : "";
    if (!name) {
        showToast(state.language === "tr" ? "Cihaz adı boş olamaz!" : "Device name cannot be empty!", "error");
        return;
    }
    const appId = devEditApp ? devEditApp.value : "";
    if (!appId) {
        showToast(state.language === "tr" ? "Ağ seçimi zorunludur!" : "Network selection is required!", "error");
        return;
    }
    const dpId = devEditProfile ? devEditProfile.value : "";
    if (!dpId) {
        showToast(state.language === "tr" ? "Device profile seçimi zorunludur!" : "Device profile selection is required!", "error");
        return;
    }

    const data = {
        dev_eui: devEui,
        name: name,
        application_id: appId,
        device_profile_id: dpId,
        description: devEditDescription ? devEditDescription.value.trim() : "",
        is_disabled: devEditIsDisabled ? devEditIsDisabled.checked : false
    };

    const btnSave = $("#btn-save-dev-config");
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = state.language === "tr" ? "Kaydediliyor..." : "Saving...";
    }

    const r = await api("PUT", "/api/devices/" + devEui, data);

    if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "✓ " + (t("btn_save_changes") || "Değişiklikleri Kaydet");
    }

    if (r.ok) {
        logEntry("Device updated successfully: " + name, "success");
        showToast(state.language === "tr" ? "Cihaz güncellendi." : "Device updated.", "success");
        closeDevDrawer();
        await fetchDevices(state.devTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || "Güncelleme hatası";
        logEntry("Failed to update device: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

function getAppName(appId) {
    if (!appId) return "—";
    const app = findNet(appId);
    return app ? app.name : appId;
}

export async function viewDevice(devEui) {
    const r = await api("GET", "/api/devices/" + devEui);
    if (!r.ok) {
        showToast(state.language === "tr" ? "Cihaz detayları yüklenemedi" : "Failed to load device details", "error");
        return;
    }
    const dev = r.data;

    const isTr = state.language === "tr";
    const yesText = isTr ? "Evet" : "Yes";
    const noText = isTr ? "Hayır" : "No";

    const statusPill = dev.is_disabled 
        ? '<span class="status-pill inactive">' + (isTr ? 'DEVRE DIŞI' : 'DISABLED') + '</span>'
        : '<span class="status-pill active">' + (isTr ? 'AKTİF' : 'ACTIVE') + '</span>';

    const html = 
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Cihaz Adı' : 'Device Name') + '</div>' +
            '<div class="detail-value" style="font-weight: 600; color: var(--accent);">' + escapeHtml(dev.name) + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + 'DevEUI' + '</div>' +
            '<div class="detail-value id-cell">' + escapeHtml(dev.dev_eui) + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Ağ (Application)' : 'Network (Application)') + '</div>' +
            '<div class="detail-value">' +
                '<span style="font-weight: 600;">' + escapeHtml(getAppName(dev.application_id)) + '</span><br>' +
                '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(dev.application_id || "—") + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Cihaz Profili' : 'Device Profile') + '</div>' +
            '<div class="detail-value">' +
                '<span style="font-weight: 600;">' + escapeHtml(getDpName(dev.device_profile_id)) + '</span><br>' +
                '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(dev.device_profile_id || "—") + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Açıklama' : 'Description') + '</div>' +
            '<div class="detail-value">' + escapeHtml(dev.description || "—") + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Cihaz Durumu' : 'Device Status') + '</div>' +
            '<div class="detail-value" style="margin-top: 4px;">' + statusPill + '</div>' +
        '</div>';

    const title = isTr ? "Cihaz Detayları" : "Device Details";
    const subtitle = isTr ? "Cihazın yapılandırma bilgileri" : "Configuration info of the device";
    openDetailsDrawer(title, subtitle, html);
}

export function initDeviceListTab() {
    const devTenantFilter = $("#dev-tenant-select");
    const devSearchInput = $("#dev-search-input");
    const btnDevRefresh = $("#btn-dev-refresh");
    const devPageSizeSelect = $("#dev-page-size-select");

    const devIntSearchInput = $("#dev-int-search-input");
    const btnDevIntRefresh = $("#btn-dev-int-refresh");
    const devIntPageSizeSelect = $("#dev-int-page-size-select");



    // Filters and sorting event bindings
    if (devTenantFilter) {
        devTenantFilter.addEventListener("change", (e) => {
            state.devTenantFilter = e.target.value;
            state.devPage = 1;
            fetchDevices(e.target.value);
        });
    }

    if (devSearchInput) {
        devSearchInput.addEventListener("input", (e) => {
            searchDev(e.target.value);
        });
    }

    if (btnDevRefresh) {
        btnDevRefresh.addEventListener("click", () => {
            fetchDevices(state.devTenantFilter);
        });
    }

    if (devPageSizeSelect) {
        devPageSizeSelect.addEventListener("change", (e) => {
            changeDevPageSize(e.target.value);
        });
    }

    // Device intervals tab bindings
    if (devIntSearchInput) {
        devIntSearchInput.addEventListener("input", (e) => {
            state.devIntSearchQuery = e.target.value;
            state.devIntPage = 1;
            applyDevIntFiltersAndRender();
        });
    }

    if (btnDevIntRefresh) {
        btnDevIntRefresh.addEventListener("click", () => {
            fetchDeviceIntervals();
        });
    }

    if (devIntPageSizeSelect) {
        devIntPageSizeSelect.addEventListener("change", (e) => {
            state.devIntPageSize = parseInt(e.target.value, 10) || 10;
            state.devIntPage = 1;
            applyDevIntFiltersAndRender();
        });
    }

    $$("#content-device-list thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            sortDevBy(th.getAttribute("data-sort"));
        });
    });

    const devDrawerClose = $("#dev-drawer-close");
    const devDrawerOverlay = $("#dev-drawer-overlay");
    const btnSaveDevConfig = $("#btn-save-dev-config");
    const devEditApp = $("#dev_edit_app");

    if (devDrawerClose) {
        devDrawerClose.addEventListener("click", closeDevDrawer);
    }
    if (devDrawerOverlay) {
        devDrawerOverlay.addEventListener("click", (e) => {
            if (e.target === devDrawerOverlay) closeDevDrawer();
        });
    }
    if (btnSaveDevConfig) {
        btnSaveDevConfig.addEventListener("click", (e) => {
            e.preventDefault();
            saveDevice();
        });
    }
    if (devEditApp) {
        devEditApp.addEventListener("change", () => {
            onDevEditAppChange();
        });
    }

    $$("#content-device-intervals thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort");
            if (state.devIntSort.key === key) {
                state.devIntSort.dir = state.devIntSort.dir === "asc" ? "desc" : "asc";
            } else {
                state.devIntSort.key = key;
                state.devIntSort.dir = "asc";
            }
            state.devIntPage = 1;
            applyDevIntFiltersAndRender();
        });
    });
}
