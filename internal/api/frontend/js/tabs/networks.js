import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry, openDetailsDrawer, closeDetailsDrawer } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { findOrg, getOrgName } from "./orgs.js";

export function findNet(id) {
    return state.applications.find(app => app.id === id);
}

export async function fetchApplications(tenantId) {
    let url = "/api/applications";
    if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
    const r = await api("GET", url);
    if (r.ok) {
        const data = r.data;
        state.applications = data.applications || [];
        logEntry("Applications list loaded: " + state.applications.length + " items", "success");
        applyAppFiltersAndRender();
        return true;
    } else {
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to load applications list: " + err, "error");
        showToast(err, "error");
        return false;
    }
}

export async function deleteApplication(id) {
    const app = findNet(id);
    if (!app) return;
    const isTr = state.language === "tr";
    if (!confirm("'" + app.name + "' " + (isTr ? "ağını silmek istediğinize emin misiniz?" : "are you sure you want to delete this network?"))) return;
    const r = await api("DELETE", "/api/applications/" + id);
    if (r.ok) {
        logEntry("Network deleted: " + app.name, "success");
        showToast("'" + app.name + "' " + (isTr ? "silindi." : "deleted."), "success");
        await fetchApplications(state.netTenantFilter);
    } else {
        const errMsg = (r.data && r.data.error) || (isTr ? "Silme hatası" : "Delete error");
        logEntry("Failed to delete network: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function viewApplication(id, mode = "view") {
    const app = findNet(id);
    if (!app) {
        console.log("viewApplication: app NOT FOUND for id =", id);
        return;
    }

    const isTr = state.language === "tr";

    let html = "";
    if (mode === "edit") {
        html = 
            '<div class="detail-item">' +
                '<div class="form-group">' +
                    '<label style="display: block; font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; margin-bottom: 6px;">' + (isTr ? 'Ağ Adı' : 'Network Name') + '</label>' +
                    '<input type="text" id="edit-app-name-input" class="settings-input" style="width: 100%; font-weight: 600; padding: 8px 10px; font-size: 0.85rem; background: var(--bg-field); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); outline: none;" value="' + escapeHtml(app.name) + '">' +
                '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + 'ID' + '</div>' +
                '<div class="detail-value id-cell">' + escapeHtml(app.id) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Organizasyon (Tenant)' : 'Organization (Tenant)') + '</div>' +
                '<div class="detail-value">' +
                    '<span style="font-weight: 600;">' + escapeHtml(getOrgName(app.tenant_id)) + '</span><br>' +
                    '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(app.tenant_id || "—") + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="form-group">' +
                    '<label style="display: block; font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; margin-bottom: 6px;">' + (isTr ? 'Açıklama' : 'Description') + '</label>' +
                    '<textarea id="edit-app-desc-input" class="settings-input" style="width: 100%; min-height: 70px; font-size: 0.85rem; padding: 8px 10px; background: var(--bg-field); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); outline: none; resize: vertical; font-family: inherit;">' + escapeHtml(app.description || "") + '</textarea>' +
                '</div>' +
            '</div>';
    } else {
        html = 
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Ağ Adı' : 'Network Name') + '</div>' +
                '<div class="detail-value" style="font-weight: 600; font-size: 0.95rem; color: var(--text);">' + escapeHtml(app.name) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + 'ID' + '</div>' +
                '<div class="detail-value id-cell">' + escapeHtml(app.id) + '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Organizasyon (Tenant)' : 'Organization (Tenant)') + '</div>' +
                '<div class="detail-value">' +
                    '<span style="font-weight: 600;">' + escapeHtml(getOrgName(app.tenant_id)) + '</span><br>' +
                    '<span class="id-cell" style="font-size: 11px; opacity: 0.7;">' + escapeHtml(app.tenant_id || "—") + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="detail-item">' +
                '<div class="detail-label">' + (isTr ? 'Açıklama' : 'Description') + '</div>' +
                '<div class="detail-value" style="font-size: 0.85rem; color: var(--text); white-space: pre-wrap; line-height: 1.4;">' + escapeHtml(app.description || "—") + '</div>' +
            '</div>';
    }

    const drawerSubtitle = mode === "edit"
        ? (isTr ? "Ağı Düzenle" : "Edit Network")
        : (isTr ? "Ağ Detayları" : "Network Details");

    openDetailsDrawer(app.name, drawerSubtitle, html);

    // Dynamically update the footer of the details drawer
    const footer = $("#details-drawer .drawer-footer");
    if (footer) {
        if (mode === "edit") {
            footer.innerHTML = '<button class="btn btn-secondary btn-sm" id="btn-save-app-name" style="width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;">✓ ' + (isTr ? 'Ayarları Kaydet' : 'Save Settings') + '</button>';
        } else {
            footer.innerHTML = '<button class="btn btn-secondary btn-sm" id="btn-close-details" style="width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;" data-i18n="btn_close">' + (isTr ? 'Kapat' : 'Close') + '</button>';
            const btnClose = $("#btn-close-details");
            if (btnClose) {
                btnClose.addEventListener("click", closeDetailsDrawer);
            }
        }
    }

    const btnSave = $("#btn-save-app-name");
    if (btnSave && mode === "edit") {
        btnSave.addEventListener("click", async () => {
            const newNameInput = $("#edit-app-name-input");
            const newDescInput = $("#edit-app-desc-input");
            if (!newNameInput) return;
            const newName = newNameInput.value.trim();
            const newDesc = newDescInput ? newDescInput.value.trim() : "";

            if (!newName) {
                showToast(isTr ? "Ağ adı boş olamaz!" : "Network name cannot be empty!", "error");
                newNameInput.focus();
                return;
            }

            btnSave.disabled = true;
            btnSave.textContent = isTr ? "Kaydediliyor..." : "Saving...";

            const r = await api("PUT", "/api/applications/" + app.id, {
                name: newName,
                description: newDesc
            });

            btnSave.disabled = false;
            btnSave.textContent = "✓ " + (isTr ? "Ayarları Kaydet" : "Save Settings");

            if (r.ok) {
                showToast(isTr ? "Ağ başarıyla güncellendi." : "Network updated successfully.", "success");
                logEntry("Network updated: " + newName, "success");
                
                app.name = newName;
                app.description = newDesc;

                const currentApp = findNet(app.id);
                if (currentApp) {
                    currentApp.name = newName;
                    currentApp.description = newDesc;
                }

                const detailsDrawerTitle = $("#details-drawer-title");
                if (detailsDrawerTitle) detailsDrawerTitle.textContent = newName;

                applyAppFiltersAndRender();
                
                // Close the modal/drawer after successful save
                closeDetailsDrawer();
            } else {
                const errMsg = (r.data && r.data.error) || "Güncelleme hatası";
                showToast(errMsg, "error");
                logEntry("Failed to update application: " + errMsg, "error");
            }
        });
    }
}

export function populateNetFilterTenantSelect() {
    const netTenantFilter = $("#net-tenant-select");
    if (!netTenantFilter) return;
    const firstOpt = netTenantFilter.querySelector('option[value=""]');
    netTenantFilter.innerHTML = "";
    if (firstOpt) {
        netTenantFilter.appendChild(firstOpt);
    } else {
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = t("select_all_tenants");
        netTenantFilter.appendChild(defaultOpt);
    }

    state.organizations.forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        netTenantFilter.appendChild(opt);
    });

    netTenantFilter.value = state.netTenantFilter || "";
}

export function applyAppFiltersAndRender() {
    const q = state.appSearchQuery.toLowerCase();
    const tFilter = state.netTenantFilter;

    let filtered = state.applications;
    if (tFilter) {
        filtered = filtered.filter(app => app.tenant_id === tFilter);
    }

    if (q) {
        state.appFiltered = filtered.filter(app => {
            return (app.name && app.name.toLowerCase().includes(q)) ||
                   (app.tenant_id && app.tenant_id.toLowerCase().includes(q));
        });
    } else {
        state.appFiltered = filtered.slice();
    }

    const sk = state.appSort.key;
    const sd = state.appSort.dir === "asc" ? 1 : -1;
    state.appFiltered.sort((a, b) => {
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

    const totalPages = Math.max(1, Math.ceil(state.appFiltered.length / state.appPageSize));
    if (state.appPage > totalPages) state.appPage = totalPages;

    renderAppTable();
    renderAppPagination();
    renderAppTotalCount();
    updateAppSortIcons();
}

export function renderAppTable() {
    const netTableBody = $("#net-table-body");
    const netEmptyState = $("#net-empty-state");
    if (!netTableBody) return;
    netTableBody.innerHTML = "";

    if (state.appFiltered.length === 0) {
        if (netEmptyState) netEmptyState.style.display = "block";
        return;
    }
    if (netEmptyState) netEmptyState.style.display = "none";

    const start = (state.appPage - 1) * state.appPageSize;
    const end = Math.min(start + state.appPageSize, state.appFiltered.length);
    const pageItems = state.appFiltered.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const app = pageItems[i];
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", app.id);
        const dateVal = app.created_at || app.createdAt || app.created || new Date();
        const d = new Date(dateVal);
        const locale = state.language === "tr" ? "tr-TR" : "en-US";
        const formattedDate = isNaN(d.getTime()) ? new Date().toLocaleDateString(locale) : d.toLocaleDateString(locale);

        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(app.name)}</span></td>` +
            `<td><span class="org-name-primary">${escapeHtml(getOrgName(app.tenant_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(app.tenant_id || "—")}</span></td>` +
            `<td><span class="date-cell">${formattedDate}</span></td>` +
            `<td><div class="row-actions">` +
            `<button class="row-action-btn view-btn" data-id="${app.id}" title="Görüntüle">👁</button>` +
            `<button class="row-action-btn edit-btn" data-id="${app.id}" title="Düzenle">✏</button>` +
            `<button class="row-action-btn danger delete-btn" data-id="${app.id}" title="Sil">🗑</button>` +
            `</div></td>`;
        
        tr.addEventListener("click", (e) => {
            if (e.target.closest(".delete-btn")) {
                e.stopPropagation();
                deleteApplication(app.id);
                return;
            }
            if (e.target.closest(".edit-btn")) {
                e.stopPropagation();
                viewApplication(app.id, "edit");
                return;
            }
            if (e.target.closest(".view-btn")) {
                e.stopPropagation();
                viewApplication(app.id, "view");
                return;
            }
            viewApplication(app.id, "view");
        });
        netTableBody.appendChild(tr);
    }
}

export function renderAppPagination() {
    const netPaginationEl = $("#net-pagination");
    if (!netPaginationEl) return;
    netPaginationEl.innerHTML = "";
    const total = state.appFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.appPageSize));
    const current = state.appPage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToAppPage(current - 1); });
    netPaginationEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToAppPage(pageNum); };
        })(p));
        netPaginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToAppPage(current + 1); });
    netPaginationEl.appendChild(nextBtn);
}

export function renderAppTotalCount() {
    const netTotalCountEl = $("#net-total-count");
    if (netTotalCountEl) {
        netTotalCountEl.innerHTML = t("footer_total_net").replace("{count}", state.appFiltered.length);
    }
}

export function updateAppSortIcons() {
    const allIcons = $$("[id^='net-sort-icon-']");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }
    const icon = $("#net-sort-icon-" + state.appSort.key);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = state.appSort.dir === "asc" ? "▲" : "▼";
    }
}

export function goToAppPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.appFiltered.length / state.appPageSize));
    if (n < 1 || n > totalPages) return;
    state.appPage = n;
    applyAppFiltersAndRender();
}

export function sortNetBy(key) {
    if (state.appSort.key === key) {
        state.appSort.dir = state.appSort.dir === "asc" ? "desc" : "asc";
    } else {
        state.appSort.key = key;
        state.appSort.dir = "asc";
    }
    state.appPage = 1;
    applyAppFiltersAndRender();
}

export function searchNet(q) {
    state.appSearchQuery = q;
    state.appPage = 1;
    applyAppFiltersAndRender();
}

export function changeNetPageSize(n) {
    state.appPageSize = parseInt(n, 10) || 5;
    state.appPage = 1;
    applyAppFiltersAndRender();
}

export function initNetworksTab() {
    const netTenantFilter = $("#net-tenant-select");
    const netSearchInput = $("#net-search-input");
    const btnNetRefresh = $("#btn-net-refresh");
    const netPageSizeSelect = $("#net-page-size-select");
    const btnCloseDetails = $("#btn-close-details");
    const detailsDrawerOverlay = $("#details-drawer-overlay");
    const detailsDrawerClose = $("#details-drawer-close");

    if (netTenantFilter) {
        netTenantFilter.addEventListener("change", (e) => {
            state.netTenantFilter = e.target.value;
            state.appPage = 1;
            fetchApplications(e.target.value);
        });
    }

    if (netSearchInput) {
        netSearchInput.addEventListener("input", (e) => {
            searchNet(e.target.value);
        });
    }

    if (btnNetRefresh) {
        btnNetRefresh.addEventListener("click", () => {
            fetchApplications(state.netTenantFilter);
        });
    }

    if (netPageSizeSelect) {
        netPageSizeSelect.addEventListener("change", (e) => {
            changeNetPageSize(e.target.value);
        });
    }

    if (btnCloseDetails) {
        btnCloseDetails.addEventListener("click", closeDetailsDrawer);
    }
    if (detailsDrawerClose) {
        detailsDrawerClose.addEventListener("click", closeDetailsDrawer);
    }
    if (detailsDrawerOverlay) {
        detailsDrawerOverlay.addEventListener("click", (e) => {
            if (e.target === detailsDrawerOverlay) closeDetailsDrawer();
        });
    }

    $$("#content-networks thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            sortNetBy(th.getAttribute("data-sort"));
        });
    });
}
