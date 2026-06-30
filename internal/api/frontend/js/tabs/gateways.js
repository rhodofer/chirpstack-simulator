import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry, openDetailsDrawer, closeDetailsDrawer } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { applyRowLocks } from "../passive-mode-ui.js";
import { findOrg, getOrgName } from "./orgs.js";

export function findGw(id) {
    return (state.gateways || []).find(gw => gw.id === id);
}

export async function fetchGateways(tenantId) {
    let url = "/api/gateways";
    if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
    const r = await api("GET", url);
    if (r.ok) {
        const data = r.data;
        state.gateways = data.gateways || [];
        logEntry("Gateways list loaded: " + state.gateways.length + " items", "success");
        applyGwFiltersAndRender();
        return true;
    } else {
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to load gateways list: " + err, "error");
        showToast(err, "error");
        return false;
    }
}

export async function deleteGateway(id) {
    const gw = findGw(id);
    if (!gw) return;
    const isTr = state.language === "tr";
    if (!confirm("'" + gw.name + "' " + (isTr ? "geçidini silmek istediğinize emin misiniz?" : "are you sure you want to delete this gateway?"))) return;
    const r = await api("DELETE", "/api/gateways/" + id);
    if (r.ok) {
        logEntry("Gateway deleted: " + gw.name, "success");
        showToast("'" + gw.name + "' " + (isTr ? "silindi." : "deleted."), "success");
        await fetchGateways(state.gwTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || (isTr ? "Silme hatası" : "Delete error");
        logEntry("Failed to delete gateway: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function viewGateway(id, mode = "view") {
    const gw = findGw(id);
    if (!gw) {
        console.log("viewGateway: gw NOT FOUND for id =", id);
        return;
    }

    const isTr = state.language === "tr";

    let html = "";
    if (mode === "edit") {
        // Currently, we don't have editing for gateways as per plan, so we show view details or a simple prompt.
        html = 
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Geçit Adı' : 'Gateway Name') + '</div>' +
                '<div class="detail-value" style="font-weight: 600; font-size: 0.95rem; color: var(--text);">' + escapeHtml(gw.name) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + 'Gateway ID (EUI)' + '</div>' +
                '<div class="detail-value id-cell">' + escapeHtml(gw.id) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Organizasyon (Tenant)' : 'Organization (Tenant)') + '</div>' +
                '<div class="detail-value">' +
                    '<span style="font-weight: 600;">' + escapeHtml(getOrgName(gw.tenant_id)) + '</span><br>' +
                    '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(gw.tenant_id || "—") + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Açıklama' : 'Description') + '</div>' +
                '<div class="detail-value" style="font-size: 0.85rem; color: var(--text); white-space: pre-wrap; line-height: 1.4;">' + escapeHtml(gw.description || "—") + '</div>' +
            '</div>';
    } else {
        html = 
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Geçit Adı' : 'Gateway Name') + '</div>' +
                '<div class="detail-value" style="font-weight: 600; font-size: 0.95rem; color: var(--text);">' + escapeHtml(gw.name) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + 'Gateway ID (EUI)' + '</div>' +
                '<div class="detail-value id-cell">' + escapeHtml(gw.id) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Organizasyon (Tenant)' : 'Organization (Tenant)') + '</div>' +
                '<div class="detail-value">' +
                    '<span style="font-weight: 600;">' + escapeHtml(getOrgName(gw.tenant_id)) + '</span><br>' +
                    '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(gw.tenant_id || "—") + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Açıklama' : 'Description') + '</div>' +
                '<div class="detail-value" style="font-size: 0.85rem; color: var(--text); white-space: pre-wrap; line-height: 1.4;">' + escapeHtml(gw.description || "—") + '</div>' +
            '</div>';
    }

    openDetailsDrawer(gw.name || "Geçit Detayı", html, mode === "edit" ? "edit" : "view", async (drawerBody) => {
        // Save handler if needed (e.g. if we add update endpoint later)
        closeDetailsDrawer();
    });
}

export async function createGateway(id, name, tenantId, description) {
    const r = await api("POST", "/api/gateways", {
        id: id,
        name: name,
        tenant_id: tenantId,
        description: description || ""
    });

    if (r.ok) {
        logEntry("Gateway created: " + name + " (ID: " + id + ")", "success");
        showToast("'" + name + "' geçidi oluşturuldu.", "success");
        await fetchGateways(state.gwTenantFilter);
        return true;
    } else {
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to create gateway: " + err, "error");
        showToast(err, "error");
        return false;
    }
}

export function searchGws(q) {
    state.gwSearchQuery = q;
    state.gwTablePage = 1;
    applyGwFiltersAndRender();
}

export function changeGwPageSize(n) {
    state.gwTablePageSize = parseInt(n, 10) || 5;
    state.gwTablePage = 1;
    applyGwFiltersAndRender();
}

export function goToGwPage(n) {
    const filtered = state.filteredGateways || [];
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.gwTablePageSize));
    if (n < 1 || n > totalPages) return;
    state.gwTablePage = n;
    applyGwFiltersAndRender();
}

export function applyGwFiltersAndRender() {
    const rawList = state.gateways || [];
    const q = (state.gwSearchQuery || "").toLowerCase();

    let filtered = rawList.slice();

    // 1. Tenant Filter
    if (state.gwTenantFilter) {
        filtered = filtered.filter(gw => gw.tenant_id === state.gwTenantFilter);
    }

    // 2. Search Query Filter
    if (q) {
        filtered = filtered.filter(gw => {
            return (gw.name && gw.name.toLowerCase().indexOf(q) !== -1) ||
                   (gw.id && gw.id.toLowerCase().indexOf(q) !== -1) ||
                   (gw.description && gw.description.toLowerCase().indexOf(q) !== -1);
        });
    }

    // 3. Sort
    const key = state.gwTableSort.key;
    const dir = state.gwTableSort.dir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
        let valA = a[key] ? a[key].toString().toLowerCase() : "";
        let valB = b[key] ? b[key].toString().toLowerCase() : "";
        return valA.localeCompare(valB) * dir;
    });

    state.filteredGateways = filtered;
    renderGwTable();
    renderGwPagination();
    renderGwTotalCount();
    updateSortIcons();
}

export function renderGwTable() {
    const tbody = $("#gw-table-body");
    const emptyState = $("#gw-empty-state");
    if (!tbody) return;
    tbody.innerHTML = "";

    const items = state.filteredGateways || [];

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }
    if (emptyState) emptyState.style.display = "none";

    const start = (state.gwTablePage - 1) * state.gwTablePageSize;
    const end = Math.min(start + state.gwTablePageSize, items.length);
    const pageItems = items.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const gw = pageItems[i];
        const tr = document.createElement("tr");

        const idShort = gw.id.length > 20 ? gw.id.substring(0, 20) + "…" : gw.id;
        const orgName = getOrgName(gw.tenant_id);

        tr.innerHTML = 
            `<td>` +
                `<div style="font-weight:600; color:var(--text);">${escapeHtml(gw.name)}</div>` +
                `<div style="font-size:11px; opacity:0.6; margin-top:2px;">${escapeHtml(gw.description || "")}</div>` +
            `</td>` +
            `<td><span class="id-cell">${escapeHtml(idShort)}</span></td>` +
            `<td>` +
                `<div style="font-weight:600;">${escapeHtml(orgName)}</div>` +
                `<div class="id-cell" style="font-size:11px; opacity:0.6; margin-top:2px;">${escapeHtml(gw.tenant_id)}</div>` +
            `</td>` +
            `<td><span class="date-cell">${escapeHtml(gw.created_at || "—")}</span></td>` +
            `<td>` +
                `<div class="row-actions">` +
                    `<button class="row-action-btn view-btn" data-id="${gw.id}" title="Görüntüle">👁</button>` +
                    `<button class="row-action-btn danger delete-btn" data-id="${gw.id}" title="Sil">🗑</button>` +
                `</div>` +
            `</td>`;

        tr.addEventListener("click", (e) => {
            if (e.target.closest(".delete-btn")) {
                e.stopPropagation();
                deleteGateway(gw.id);
                return;
            }
            if (e.target.closest(".view-btn")) {
                e.stopPropagation();
                viewGateway(gw.id, "view");
                return;
            }
            viewGateway(gw.id, "view");
        });

        tbody.appendChild(tr);
    }
    applyRowLocks(state.passiveMode);
}

export function renderGwPagination() {
    const pEl = $("#gw-pagination");
    if (!pEl) return;
    pEl.innerHTML = "";

    const items = state.filteredGateways || [];
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / state.gwTablePageSize));
    const current = state.gwTablePage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToGwPage(current - 1); });
    pEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", () => { goToGwPage(p); });
        pEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToGwPage(current + 1); });
    pEl.appendChild(nextBtn);
}

export function renderGwTotalCount() {
    const totalEl = $("#gw-total-count");
    if (!totalEl) return;
    const count = (state.filteredGateways || []).length;
    const prefix = state.language === "tr" ? "Toplam:" : "Total:";
    const suffix = state.language === "tr" ? "Geçit" : "Gateways";
    totalEl.innerHTML = `${prefix} <strong>${count}</strong> ${suffix}`;
}

export function sortBy(key) {
    if (state.gwTableSort.key === key) {
        state.gwTableSort.dir = state.gwTableSort.dir === "asc" ? "desc" : "asc";
    } else {
        state.gwTableSort.key = key;
        state.gwTableSort.dir = "asc";
    }
    state.gwTablePage = 1;
    applyGwFiltersAndRender();
}

function updateSortIcons() {
    const allIcons = $$("#gw-table thead .sort-icon");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }

    const key = state.gwTableSort.key;
    const dir = state.gwTableSort.dir;
    const icon = $(`#gw-sort-icon-${key}`);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = dir === "asc" ? "▲" : "▼";
    }
}

export function populateGwFilterTenantSelect() {
    const select = $("#gw-tenant-select");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">${t("select_all_tenants") || "Tüm Tenant'lar"}</option>`;

    const orgs = state.organizations || [];
    orgs.forEach(org => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        select.appendChild(opt);
    });

    select.value = currentVal;
}

export function populateGwModalTenantSelect() {
    const select = $("#gw-tenant-id");
    if (!select) return;
    select.innerHTML = "";

    const orgs = state.organizations || [];
    orgs.forEach(org => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        select.appendChild(opt);
    });
}

export function initGatewaysTab() {
    // 1. Initial State keys for gateways if not exists
    state.gateways = state.gateways || [];
    state.filteredGateways = state.filteredGateways || [];
    state.gwTablePage = state.gwTablePage || 1;
    state.gwTablePageSize = state.gwTablePageSize || 5;
    state.gwSearchQuery = state.gwSearchQuery || "";
    state.gwTenantFilter = state.gwTenantFilter || "";
    state.gwTableSort = state.gwTableSort || { key: "name", dir: "asc" };

    // 2. Elements references
    const btnAddGw = $("#btn-add-gw");
    const modalOverlay = $("#gw-modal-overlay");
    const modalClose = $("#gw-modal-close");
    const modalCancel = $("#gw-modal-cancel");
    const gwForm = $("#gw-modal-form");

    const searchInput = $("#gw-search-input");
    const tenantSelect = $("#gw-tenant-select");
    const pageSizeSelect = $("#gw-page-size-select");
    const btnRefresh = $("#btn-gw-refresh");

    // 3. Setup event listeners
    if (btnAddGw) {
        btnAddGw.addEventListener("click", () => {
            populateGwModalTenantSelect();
            const gwNameInput = $("#gw-name");
            const gwIdInput = $("#gw-id");
            const gwDescInput = $("#gw-description");
            const gwTenantSelect = $("#gw-tenant-id");

            if (gwNameInput) gwNameInput.value = "";
            if (gwIdInput) gwIdInput.value = "";
            if (gwDescInput) gwDescInput.value = "";
            
            // Set current tenant selection if filter is set
            if (gwTenantSelect && state.gwTenantFilter) {
                gwTenantSelect.value = state.gwTenantFilter;
            }

            if (modalOverlay) modalOverlay.style.display = "flex";
            setTimeout(() => { if (gwNameInput) gwNameInput.focus(); }, 100);
        });
    }

    const hideAddModal = () => {
        if (modalOverlay) modalOverlay.style.display = "none";
    };

    if (modalClose) modalClose.addEventListener("click", hideAddModal);
    if (modalCancel) modalCancel.addEventListener("click", hideAddModal);
    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) hideAddModal();
        });
    }

    if (gwForm) {
        gwForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = $("#gw-id") ? $("#gw-id").value.trim() : "";
            const name = $("#gw-name") ? $("#gw-name").value.trim() : "";
            const tenant = $("#gw-tenant-id") ? $("#gw-tenant-id").value : "";
            const desc = $("#gw-description") ? $("#gw-description").value.trim() : "";

            if (!id || !name || !tenant) return;
            const ok = await createGateway(id, name, tenant, desc);
            if (ok) hideAddModal();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchGws(e.target.value);
        });
    }

    if (tenantSelect) {
        tenantSelect.addEventListener("change", (e) => {
            state.gwTenantFilter = e.target.value;
            state.gwTablePage = 1;
            applyGwFiltersAndRender();
        });
    }

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", (e) => {
            changeGwPageSize(e.target.value);
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            fetchGateways(state.gwTenantFilter);
        });
    }

    // Sort headers
    $$("#gw-table thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            sortBy(th.getAttribute("data-sort"));
        });
    });
}
