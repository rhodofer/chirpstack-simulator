import { state } from "../state.js";
import { $, $$, escapeHtml } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

export async function fetchSimulationDevices() {
    const r = await api("GET", "/api/simulation/devices");
    if (r.ok && r.data && r.data.devices) {
        state.devStatusList = r.data.devices;
        applyDevStatusFiltersAndRender();
    }
}

export function applyDevStatusFiltersAndRender() {
    const q = state.devStatusSearchQuery.toLowerCase();
    if (q) {
        state.devStatusFiltered = state.devStatusList.filter((d) => {
            return (d.device_name && d.device_name.toLowerCase().indexOf(q) !== -1) ||
                   (d.dev_eui && d.dev_eui.toLowerCase().indexOf(q) !== -1) ||
                   (d.app_name && d.app_name.toLowerCase().indexOf(q) !== -1);
        });
    } else {
        state.devStatusFiltered = state.devStatusList.slice();
    }

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
        const stateClass = d.state === "Activated" ? "activated" : "otaa";
        const stateLabel = d.state === "Activated" ? "AKTİF" : "OTAA";
        
        tr.innerHTML =
            `<td><span class="org-name-primary">${escapeHtml(d.device_name)}</span></td>` +
            `<td><span class="id-cell">${escapeHtml(d.dev_eui)}</span></td>` +
            `<td><span class="org-name-secondary">${escapeHtml(d.app_name)}</span></td>` +
            `<td><span class="status-pill ${stateClass}">${stateLabel}</span></td>` +
            `<td><span class="org-name-primary">${d.uplink_count}</span></td>`;
        tbody.appendChild(tr);
    }
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

export function initDeviceStatusTab() {
    const devStatusSearchInput = $("#dev-status-search-input");
    const btnDevStatusRefresh = $("#btn-dev-status-refresh");
    const devStatusPageSizeSelect = $("#dev-status-page-size-select");

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
}
