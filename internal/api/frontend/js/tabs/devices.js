import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry, openDetailsDrawer, closeDetailsDrawer } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { applyRowLocks } from "../passive-mode-ui.js";
import { getOrgName, applyFiltersAndRender as applyOrgFiltersAndRender } from "./orgs.js";

export function findDp(id) {
    return state.dpList.find(dp => dp.id === id);
}

export async function fetchDeviceProfiles(tenantId) {
    let url = "/api/device-profiles";
    if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
    const r = await api("GET", url);
    if (r.ok && r.data.device_profiles) {
        state.dpList = r.data.device_profiles;
    } else {
        state.dpList = [];
        const errMsg = (r.data && r.data.error) || "Bağlantı hatası";
        logEntry("Failed to load device profiles: " + errMsg, "error");
    }
    applyDpFiltersAndRender();
    applyOrgFiltersAndRender();
}

export async function deleteDeviceProfile(id) {
    const dp = findDp(id);
    if (!dp) return;
    if (!confirm("'" + dp.name + "' profilini silmek istediğinize emin misiniz?")) return;
    const r = await api("DELETE", "/api/device-profiles/" + id);
    if (r.ok) {
        logEntry("Device profile deleted: " + dp.name, "success");
        showToast("'" + dp.name + "' silindi.", "success");
        await fetchDeviceProfiles(state.dpTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || "Silme hatası";
        logEntry("Failed to delete device profile: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function viewDeviceProfile(id) {
    const dp = findDp(id);
    if (!dp) return;

    const isTr = state.language === "tr";
    const yesText = isTr ? "Evet" : "Yes";
    const noText = isTr ? "Hayır" : "No";

    const html = 
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Profil Adı' : 'Profile Name') + '</div>' +
            '<div class="detail-value" style="font-weight: 600; color: var(--accent);">' + escapeHtml(dp.name) + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + 'ID' + '</div>' +
            '<div class="detail-value id-cell">' + escapeHtml(dp.id) + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Organizasyon (Tenant)' : 'Organization (Tenant)') + '</div>' +
            '<div class="detail-value">' +
                '<span style="font-weight: 600;">' + escapeHtml(getOrgName(dp.tenant_id)) + '</span><br>' +
                '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(dp.tenant_id || "—") + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Bölge (Region)' : 'Region') + '</div>' +
            '<div class="detail-value">' + escapeHtml(dp.region || "—") + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'MAC Sürümü' : 'MAC Version') + '</div>' +
            '<div class="detail-value">' + escapeHtml(dp.mac_version || "—") + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'RegParams Revizyonu' : 'RegParams Revision') + '</div>' +
            '<div class="detail-value">' + escapeHtml(dp.reg_params_revision || "—") + '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'Desteklenen Sınıflar' : 'Supported Classes') + '</div>' +
            '<div class="detail-value" style="margin-top: 4px;">' +
                '<span class="badge ' + (dp.supports_otaa ? 'badge-running' : 'badge-idle') + '" style="margin-right: 4px; border: 1px solid rgba(0,0,0,0.15);">OTAA: ' + (dp.supports_otaa ? yesText : noText) + '</span>' +
                '<span class="badge ' + (dp.supports_class_b ? 'badge-running' : 'badge-idle') + '" style="margin-right: 4px; border: 1px solid rgba(0,0,0,0.15);">Class B: ' + (dp.supports_class_b ? yesText : noText) + '</span>' +
                '<span class="badge ' + (dp.supports_class_c ? 'badge-running' : 'badge-idle') + '" style="border: 1px solid rgba(0,0,0,0.15);">Class C: ' + (dp.supports_class_c ? yesText : noText) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="detail-item">' +
            '<div class="detail-label">' + (isTr ? 'ADR Algoritması' : 'ADR Algorithm') + '</div>' +
            '<div class="detail-value">' + escapeHtml(dp.adr_algorithm_id || "default") + '</div>' +
        '</div>';

    const title = isTr ? "Cihaz Profili Detayları" : "Device Profile Details";
    const subtitle = isTr ? "Cihaz profilinin yapılandırma bilgileri" : "Configuration info of the device profile";
    openDetailsDrawer(title, subtitle, html);
}

export function populateDpFilterTenantSelect() {
    const dpTenantFilter = $("#dp-tenant-select");
    if (!dpTenantFilter) return;
    const firstOpt = dpTenantFilter.querySelector('option[value=""]');
    dpTenantFilter.innerHTML = "";
    if (firstOpt) {
        dpTenantFilter.appendChild(firstOpt);
    } else {
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = t("select_all_tenants");
        dpTenantFilter.appendChild(defaultOpt);
    }

    state.organizations.forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        dpTenantFilter.appendChild(opt);
    });

    dpTenantFilter.value = state.dpTenantFilter || "";
}

export function applyDpFiltersAndRender() {
    const q = state.dpSearchQuery.toLowerCase();
    const tFilter = state.dpTenantFilter;

    let filtered = state.dpList;
    if (tFilter) {
        filtered = filtered.filter(dp => dp.tenant_id === tFilter);
    }

    if (q) {
        state.dpFiltered = filtered.filter((dp) => {
            return (dp.name && dp.name.toLowerCase().indexOf(q) !== -1) ||
                   (dp.region && dp.region.toLowerCase().indexOf(q) !== -1);
        });
    } else {
        state.dpFiltered = filtered.slice();
    }

    const sk = state.dpSort.key;
    const sd = state.dpSort.dir === "asc" ? 1 : -1;
    state.dpFiltered.sort((a, b) => {
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

    const totalPages = Math.max(1, Math.ceil(state.dpFiltered.length / state.dpPageSize));
    if (state.dpPage > totalPages) state.dpPage = totalPages;

    renderDpTable();
    renderDpPagination();
    renderDpTotalCount();
    updateDpSortIcons();
}

export function renderDpTable() {
    const dpTableBody = $("#dp-table-body");
    const dpEmptyState = $("#dp-empty-state");
    if (!dpTableBody) return;
    dpTableBody.innerHTML = "";

    if (state.dpFiltered.length === 0) {
        if (dpEmptyState) dpEmptyState.style.display = "block";
        return;
    }
    if (dpEmptyState) dpEmptyState.style.display = "none";

    const start = (state.dpPage - 1) * state.dpPageSize;
    const end = Math.min(start + state.dpPageSize, state.dpFiltered.length);
    const pageItems = state.dpFiltered.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const dp = pageItems[i];
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", dp.id);
        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(dp.name)}</span></td>` +
            `<td><span class="org-name-primary">${escapeHtml(getOrgName(dp.tenant_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(dp.tenant_id || "—")}</span></td>` +
            `<td><span class="status-pill active">${escapeHtml(dp.region || "—")}</span></td>` +
            `<td><span class="id-cell">${escapeHtml((dp.mac_version || "").replace("LORAWAN_", ""))}</span></td>` +
            `<td>${dp.supports_otaa ? "✓" : "—"}</td>` +
            `<td>` +
                `<div class="row-actions">` +
                    `<button class="row-action-btn view-btn" data-id="${dp.id}" title="Görüntüle">👁</button>` +
                    `<button class="row-action-btn edit-btn" data-id="${dp.id}" title="Düzenle">✏</button>` +
                    `<button class="row-action-btn danger delete-btn" data-id="${dp.id}" title="Sil">🗑</button>` +
                `</div>` +
            `</td>`;

        tr.addEventListener("click", ((id) => {
            return (e) => {
                if (e.target.closest(".delete-btn")) {
                    e.stopPropagation();
                    deleteDeviceProfile(id);
                    return;
                }
                if (e.target.closest(".edit-btn")) {
                    e.stopPropagation();
                    openDpDrawer(id);
                    return;
                }
                if (e.target.closest(".view-btn")) {
                    e.stopPropagation();
                    viewDeviceProfile(id);
                    return;
                }
            };
        })(dp.id));
        dpTableBody.appendChild(tr);
    }
    applyRowLocks(state.passiveMode);
}

export function renderDpPagination() {
    const dpPaginationEl = $("#dp-pagination");
    if (!dpPaginationEl) return;
    dpPaginationEl.innerHTML = "";
    const total = state.dpFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.dpPageSize));
    const current = state.dpPage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToDpPage(current - 1); });
    dpPaginationEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToDpPage(pageNum); };
        })(p));
        dpPaginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToDpPage(current + 1); });
    dpPaginationEl.appendChild(nextBtn);
}

export function renderDpTotalCount() {
    const dpTotalCountEl = $("#dp-total-count");
    if (dpTotalCountEl) {
        dpTotalCountEl.innerHTML = t("footer_total_dp").replace("{count}", state.dpFiltered.length);
    }
}

export function updateDpSortIcons() {
    const allIcons = $$("[id^='dp-sort-icon-']");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }
    const icon = $("#dp-sort-icon-" + state.dpSort.key);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = state.dpSort.dir === "asc" ? "▲" : "▼";
    }
}

export function goToDpPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.dpFiltered.length / state.dpPageSize));
    if (n < 1 || n > totalPages) return;
    state.dpPage = n;
    applyDpFiltersAndRender();
}

export function sortDpBy(key) {
    if (state.dpSort.key === key) {
        state.dpSort.dir = state.dpSort.dir === "asc" ? "desc" : "asc";
    } else {
        state.dpSort.key = key;
        state.dpSort.dir = "asc";
    }
    state.dpPage = 1;
    applyDpFiltersAndRender();
}

export function searchDp(q) {
    state.dpSearchQuery = q;
    state.dpPage = 1;
    applyDpFiltersAndRender();
}

export function changeDpPageSize(n) {
    state.dpPageSize = parseInt(n, 10) || 5;
    state.dpPage = 1;
    applyDpFiltersAndRender();
}

export function openDpDrawer(id) {
    const dp = findDp(id);
    if (!dp) return;

    state.activeDpId = id;

    const dpEditName = $("#dp_edit_name");
    const dpEditId = $("#dp_edit_id");
    const dpEditTenant = $("#dp_edit_tenant");
    const dpEditTenantId = $("#dp_edit_tenant_id");
    const dpEditDescription = $("#dp_edit_description");
    const dpEditRegion = $("#dp_edit_region");
    const dpEditMacVersion = $("#dp_edit_mac_version");
    const dpEditRegParams = $("#dp_edit_reg_params");
    const dpEditAdrAlg = $("#dp_edit_adr_alg");
    const dpEditSupportsOtaa = $("#dp_edit_supports_otaa");
    const dpEditSupportsClassB = $("#dp_edit_supports_class_b");
    const dpEditSupportsClassC = $("#dp_edit_supports_class_c");

    if (dpEditName) dpEditName.value = dp.name || "";
    if (dpEditId) dpEditId.value = dp.id || "";
    if (dpEditTenant) dpEditTenant.value = getOrgName(dp.tenant_id);
    if (dpEditTenantId) dpEditTenantId.value = dp.tenant_id || "";
    if (dpEditDescription) dpEditDescription.value = dp.description || "";
    if (dpEditRegion) dpEditRegion.value = dp.region || "EU868";
    if (dpEditMacVersion) dpEditMacVersion.value = dp.mac_version || "LORAWAN_1_0_3";
    if (dpEditRegParams) dpEditRegParams.value = dp.reg_params_revision || "B";
    if (dpEditAdrAlg) dpEditAdrAlg.value = dp.adr_algorithm_id || "default";
    if (dpEditSupportsOtaa) dpEditSupportsOtaa.checked = !!dp.supports_otaa;
    if (dpEditSupportsClassB) dpEditSupportsClassB.checked = !!dp.supports_class_b;
    if (dpEditSupportsClassC) dpEditSupportsClassC.checked = !!dp.supports_class_c;

    const drawer = $("#dp-drawer");
    const overlay = $("#dp-drawer-overlay");
    if (drawer) drawer.classList.add("open");
    if (overlay) overlay.classList.add("open");

    logEntry("Device profile selected for edit: " + dp.name, "info");
}

export function closeDpDrawer() {
    const drawer = $("#dp-drawer");
    const overlay = $("#dp-drawer-overlay");
    if (drawer) drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    state.activeDpId = null;
}

export async function saveDeviceProfile() {
    const id = state.activeDpId;
    if (!id) return;

    const dpEditName = $("#dp_edit_name");
    const dpEditTenantId = $("#dp_edit_tenant_id");
    const dpEditDescription = $("#dp_edit_description");
    const dpEditRegion = $("#dp_edit_region");
    const dpEditMacVersion = $("#dp_edit_mac_version");
    const dpEditRegParams = $("#dp_edit_reg_params");
    const dpEditAdrAlg = $("#dp_edit_adr_alg");
    const dpEditSupportsOtaa = $("#dp_edit_supports_otaa");
    const dpEditSupportsClassB = $("#dp_edit_supports_class_b");
    const dpEditSupportsClassC = $("#dp_edit_supports_class_c");

    const name = dpEditName ? dpEditName.value.trim() : "";
    if (!name) {
        showToast(state.language === "tr" ? "Profil adı boş olamaz!" : "Profile name cannot be empty!", "error");
        return;
    }

    const data = {
        name: name,
        tenant_id: dpEditTenantId ? dpEditTenantId.value : "",
        description: dpEditDescription ? dpEditDescription.value.trim() : "",
        region: dpEditRegion ? dpEditRegion.value : "EU868",
        mac_version: dpEditMacVersion ? dpEditMacVersion.value : "LORAWAN_1_0_3",
        reg_params_revision: dpEditRegParams ? dpEditRegParams.value : "B",
        adr_algorithm_id: dpEditAdrAlg ? dpEditAdrAlg.value.trim() || "default" : "default",
        supports_otaa: dpEditSupportsOtaa ? dpEditSupportsOtaa.checked : false,
        supports_class_b: dpEditSupportsClassB ? dpEditSupportsClassB.checked : false,
        supports_class_c: dpEditSupportsClassC ? dpEditSupportsClassC.checked : false
    };

    const btnSave = $("#btn-save-dp-config");
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = state.language === "tr" ? "Kaydediliyor..." : "Saving...";
    }

    const r = await api("PUT", "/api/device-profiles/" + id, data);

    if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "✓ " + (t("btn_save_changes") || "Değişiklikleri Kaydet");
    }

    if (r.ok) {
        logEntry("Device profile updated successfully: " + name, "success");
        showToast(state.language === "tr" ? "Cihaz profili güncellendi." : "Device profile updated.", "success");
        closeDpDrawer();
        await fetchDeviceProfiles(state.dpTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || "Güncelleme hatası";
        logEntry("Failed to update device profile: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function initDevicesTab() {
    const dpTenantFilter = $("#dp-tenant-select");
    const dpSearchInput = $("#dp-search-input");
    const btnDpRefresh = $("#btn-dp-refresh");
    const dpPageSizeSelect = $("#dp-page-size-select");

    if (dpTenantFilter) {
        dpTenantFilter.addEventListener("change", (e) => {
            state.dpTenantFilter = e.target.value;
            state.dpPage = 1;
            fetchDeviceProfiles(e.target.value);
        });
    }

    if (dpSearchInput) {
        dpSearchInput.addEventListener("input", (e) => {
            searchDp(e.target.value);
        });
    }

    if (btnDpRefresh) {
        btnDpRefresh.addEventListener("click", () => {
            fetchDeviceProfiles(state.dpTenantFilter);
        });
    }

    if (dpPageSizeSelect) {
        dpPageSizeSelect.addEventListener("change", (e) => {
            changeDpPageSize(e.target.value);
        });
    }

    $$("#content-devices thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            sortDpBy(th.getAttribute("data-sort"));
        });
    });

    const dpDrawerClose = $("#dp-drawer-close");
    const dpDrawerOverlay = $("#dp-drawer-overlay");
    const btnSaveDpConfig = $("#btn-save-dp-config");

    if (dpDrawerClose) {
        dpDrawerClose.addEventListener("click", closeDpDrawer);
    }
    if (dpDrawerOverlay) {
        dpDrawerOverlay.addEventListener("click", (e) => {
            if (e.target === dpDrawerOverlay) closeDpDrawer();
        });
    }
    if (btnSaveDpConfig) {
        btnSaveDpConfig.addEventListener("click", (e) => {
            e.preventDefault();
            saveDeviceProfile();
        });
    }
}
