/* ═══════════════════════════════════════════════════════════════════════
   ChirpStack Simulator — Frontend Controller (Falt-Style)
   Organization management via ChirpStack API + simulation config.
   Pure vanilla JS, zero dependencies.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    // ─── DOM Helpers ───────────────────────────────────────────────────
    var $ = function (sel) { return document.querySelector(sel); };
    var $$ = function (sel) { return document.querySelectorAll(sel); };

    // ─── DOM References ────────────────────────────────────────────────
    // Sidebar
    var secondarySidebar  = $("#secondary-sidebar");
    var hamburgerBtn      = $("#hamburger-btn");
    var versionText       = $("#version-text");

    // Top bar
    var connectionBadge   = $("#connection-badge");
    var statusBadge       = $("#status-badge");
    var uptimeBadge       = $("#uptime-badge");
    var themeToggle       = $("#theme-toggle");

    // Tabs
    var tabOverview       = $("#tab-overview");
    var tabDevices        = $("#tab-devices");
    var tabSettings       = $("#tab-settings");
    var pageTitleBar      = $("#page-title-bar");

    // Table
    var orgTableBody      = $("#org-table-body");
    var emptyState        = $("#empty-state");
    var totalCountEl      = $("#total-count");
    var searchInput       = $("#search-input");
    var btnRefresh        = $("#btn-refresh");
    var pageSizeSelect    = $("#page-size-select");
    var paginationEl      = $("#pagination");

    // Buttons
    var btnAddOrg         = $("#btn-add-org");
    var btnStart          = $("#btn-start");
    var btnStop           = $("#btn-stop");

    // Drawer
    var drawerOverlay     = $("#drawer-overlay");
    var drawerEl          = $("#org-drawer");
    var drawerTitle       = $("#drawer-title");
    var drawerSubtitle    = $("#drawer-subtitle");
    var drawerClose       = $("#drawer-close");

    // Form
    var form              = $("#config-form");

    // Modal
    var modalOverlay      = $("#modal-overlay");
    var modalOrgName      = $("#modal-org-name");
    var modalOrgDesc      = $("#modal-org-desc");
    var modalClose        = $("#modal-close");
    var modalCancel       = $("#modal-cancel");
    var modalSave         = $("#modal-save");

    // Settings tab
    var statServerStatus  = $("#stat-server-status");
    var statServerVersion = $("#stat-server-version");
    var statSimStatus     = $("#stat-sim-status");
    var statUptime        = $("#stat-uptime");

    // Log & Toast
    var logContainer      = $("#log-container");
    var toast             = $("#toast");

    // ─── State ─────────────────────────────────────────────────────────
    var state = {
        organizations: [],
        filteredOrgs: [],
        activeOrgId: null,
        tableSort: { key: "name", dir: "asc" },
        tablePage: 1,
        tablePageSize: 5,
        searchQuery: "",
        currentTab: "overview",
        drawerOpen: false,
        drawerMode: "edit",
        currentStatus: "idle"
    };

    var pollTimer = null;

    // ─── Default Config ────────────────────────────────────────────────
    function defaultConfig() {
        return {
            tenant_id: "",
            app_name: "",
            device_prefix: "",
            duration: "0s",
            activation_time: "30s",
            device_count: 5,
            gateway_count: 2,
            uplink_interval: "30s",
            f_port: 10,
            payload: "010203",
            frequency: 868100000,
            bandwidth: 125000,
            spreading_factor: 7,
            event_topic_template: "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
            command_topic_template: "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"
        };
    }

    // ─── API Helpers ───────────────────────────────────────────────────
    async function api(method, path, body) {
        var opts = {
            method: method,
            headers: { "Content-Type": "application/json" }
        };
        if (body) {
            opts.body = JSON.stringify(body);
        }
        try {
            var resp = await fetch(path, opts);
            var data = await resp.json();
            return { ok: resp.ok, status: resp.status, data: data };
        } catch (err) {
            return { ok: false, status: 0, data: { error: err.message } };
        }
    }

    // ─── Log ───────────────────────────────────────────────────────────
    function logEntry(msg, level) {
        level = level || "info";
        var now = new Date();
        var ts = [
            now.getHours().toString().padStart(2, "0"),
            now.getMinutes().toString().padStart(2, "0"),
            now.getSeconds().toString().padStart(2, "0")
        ].join(":");

        var el = document.createElement("div");
        el.className = "log-entry log-" + level;
        el.textContent = "[" + ts + "] " + msg;
        logContainer.appendChild(el);

        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.firstChild);
        }
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // ─── Toast ─────────────────────────────────────────────────────────
    var toastTimer = null;
    function showToast(msg, type) {
        type = type || "error";
        toast.textContent = msg;
        toast.className = "toast toast-" + type;
        toast.style.display = "block";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.style.display = "none";
        }, 4000);
    }

    // ─── Status Badge ──────────────────────────────────────────────────
    function setStatusBadge(status) {
        state.currentStatus = status;
        statusBadge.className = "badge badge-" + status;
        statusBadge.textContent = status.toUpperCase();

        var isRunning = (status === "running" || status === "starting");
        btnStart.disabled = isRunning || !state.activeOrgId;
        btnStop.disabled  = !isRunning;

        // Settings tab stats
        if (statSimStatus) statSimStatus.textContent = status.toUpperCase();
    }

    function formatUptime(seconds) {
        if (seconds < 60) return seconds + "s";
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        if (m < 60) return m + "m " + s + "s";
        var h = Math.floor(m / 60);
        m = m % 60;
        return h + "h " + m + "m";
    }

    // ─── Health Check ──────────────────────────────────────────────────
    async function checkHealth() {
        var r = await api("GET", "/api/health");
        if (r.ok && r.data.status === "ok") {
            connectionBadge.className = "badge badge-online";
            connectionBadge.textContent = "Bağlı v" + (r.data.version || "?");
            if (r.data.version && versionText) {
                versionText.textContent = r.data.version;
            }
            if (statServerStatus) statServerStatus.textContent = "ÇALIŞIYOR";
            if (statServerVersion) statServerVersion.textContent = r.data.version || "—";
        } else {
            connectionBadge.className = "badge badge-offline";
            connectionBadge.textContent = "Bağlantı Yok";
            if (statServerStatus) statServerStatus.textContent = "ÇALIŞMIYOR";
        }
        return r.ok;
    }

    // ─── Poll Status ───────────────────────────────────────────────────
    async function pollStatus() {
        var r = await api("GET", "/api/status");
        if (!r.ok) return;

        var data = r.data;
        setStatusBadge(data.status || "idle");

        if (data.uptime_seconds !== undefined && data.uptime_seconds !== null) {
            uptimeBadge.style.display = "inline-flex";
            uptimeBadge.textContent = "⏱ " + formatUptime(data.uptime_seconds);
            if (statUptime) statUptime.textContent = formatUptime(data.uptime_seconds);
        } else {
            uptimeBadge.style.display = "none";
        }

        if (data.status === "idle" && state.currentStatus !== "idle") {
            logEntry("Simülasyon tamamlandı.", "success");
        }
        if (data.status === "error") {
            logEntry("Simülasyon hatası oluştu!", "error");
        }
    }

    function startPolling() {
        stopPolling();
        pollStatus();
        pollTimer = setInterval(pollStatus, 2000);
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    // ─── Organization API ──────────────────────────────────────────────
    async function fetchOrganizations() {
        var r = await api("GET", "/api/organizations");
        if (r.ok && r.data.organizations) {
            state.organizations = r.data.organizations;
        } else {
            state.organizations = [];
            var errMsg = (r.data && r.data.error) || "Bağlantı hatası";
            logEntry("Organizasyonlar yüklenemedi: " + errMsg, "error");
        }
        applyFiltersAndRender();
    }

    async function createOrganization(name, description) {
        var r = await api("POST", "/api/organizations", {
            name: name,
            description: description || ""
        });

        if (r.ok) {
            var org = r.data;
            logEntry("Yeni organizasyon oluşturuldu: " + org.name + " (ID: " + org.id + ")", "success");
            showToast("'" + org.name + "' organizasyonu oluşturuldu.", "success");
            await fetchOrganizations();
            openDrawer(org.id);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Organizasyon oluşturma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            return false;
        }
    }

    async function deleteOrganization(id) {
        var org = findOrg(id);
        if (!org) return;

        if (!confirm("'" + org.name + "' organizasyonunu silmek istediğinize emin misiniz?")) {
            return;
        }

        var r = await api("DELETE", "/api/organizations/" + id);
        if (r.ok) {
            logEntry("Organizasyon silindi: " + org.name, "success");
            showToast("'" + org.name + "' silindi.", "success");
            if (state.activeOrgId === id) {
                closeDrawer();
                state.activeOrgId = null;
            }
            await fetchOrganizations();
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Organizasyon silme hatası: " + errMsg, "error");
            showToast(errMsg, "error");
        }
    }

    // ─── Table: Sort, Filter, Paginate, Render ─────────────────────────
    function applyFiltersAndRender() {
        // Filter
        var q = state.searchQuery.toLowerCase();
        if (q) {
            state.filteredOrgs = state.organizations.filter(function (org) {
                return (org.name && org.name.toLowerCase().indexOf(q) !== -1) ||
                       (org.id && org.id.toLowerCase().indexOf(q) !== -1);
            });
        } else {
            state.filteredOrgs = state.organizations.slice();
        }

        // Sort
        var sk = state.tableSort.key;
        var sd = state.tableSort.dir === "asc" ? 1 : -1;
        state.filteredOrgs.sort(function (a, b) {
            var va, vb;
            if (sk === "name") {
                va = (a.name || "").toLowerCase();
                vb = (b.name || "").toLowerCase();
            } else if (sk === "id") {
                va = (a.id || "").toLowerCase();
                vb = (b.id || "").toLowerCase();
            } else if (sk === "status") {
                va = "active";
                vb = "active";
            } else if (sk === "date") {
                va = "";
                vb = "";
            } else {
                va = "";
                vb = "";
            }
            if (va < vb) return -1 * sd;
            if (va > vb) return 1 * sd;
            return 0;
        });

        // Clamp page
        var totalPages = Math.max(1, Math.ceil(state.filteredOrgs.length / state.tablePageSize));
        if (state.tablePage > totalPages) state.tablePage = totalPages;

        renderTable();
        renderPagination();
        renderTotalCount();
        updateSortIcons();
    }

    function renderTable() {
        orgTableBody.innerHTML = "";

        if (state.filteredOrgs.length === 0) {
            emptyState.style.display = "block";
            return;
        }
        emptyState.style.display = "none";

        var start = (state.tablePage - 1) * state.tablePageSize;
        var end = Math.min(start + state.tablePageSize, state.filteredOrgs.length);
        var pageItems = state.filteredOrgs.slice(start, end);

        for (var i = 0; i < pageItems.length; i++) {
            var org = pageItems[i];
            var tr = document.createElement("tr");
            tr.setAttribute("data-id", org.id);
            if (org.id === state.activeOrgId) {
                tr.className = "selected";
            }

            var idShort = org.id.length > 20 ? org.id.substring(0, 20) + "…" : org.id;
            var isActive = true; // varsayılan: tümü aktif

            tr.innerHTML =
                '<td>' +
                    '<div class="org-name-cell">' +
                        '<div class="org-status-dot ' + (isActive ? '' : 'inactive') + '"></div>' +
                        '<div class="org-name-text">' +
                            '<span class="org-name-primary">' + escapeHtml(org.name) + '</span>' +
                            '<span class="org-name-secondary">Ana Organizasyon</span>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td><span class="status-pill active">AKTİF</span></td>' +
                '<td><span class="id-cell">' + escapeHtml(idShort) + '</span></td>' +
                '<td><span class="date-cell">—</span></td>' +
                '<td>' +
                    '<div class="row-actions">' +
                        '<button class="row-action-btn view-btn" data-id="' + org.id + '" title="Görüntüle">👁</button>' +
                        '<button class="row-action-btn edit-btn" data-id="' + org.id + '" title="Düzenle">✏</button>' +
                        '<button class="row-action-btn danger delete-btn" data-id="' + org.id + '" title="Sil">🗑</button>' +
                    '</div>' +
                '</td>';

            // Row click → open drawer
            tr.addEventListener("click", (function (id) {
                return function (e) {
                    // Silme butonuna tıklanırsa silme işlemini tetikle
                    if (e.target.closest(".delete-btn")) {
                        e.stopPropagation();
                        deleteOrganization(id);
                        return;
                    }
                    // Düzenle butonuna tıklanırsa
                    if (e.target.closest(".edit-btn")) {
                        e.stopPropagation();
                        openDrawer(id);
                        return;
                    }
                    // Görüntüle butonuna tıklanırsa
                    if (e.target.closest(".view-btn")) {
                        e.stopPropagation();
                        openDrawer(id);
                        return;
                    }
                    // Satır tıklaması → drawer aç
                    openDrawer(id);
                };
            })(org.id));

            orgTableBody.appendChild(tr);
        }
    }

    function renderPagination() {
        paginationEl.innerHTML = "";
        var total = state.filteredOrgs.length;
        var totalPages = Math.max(1, Math.ceil(total / state.tablePageSize));
        var current = state.tablePage;

        // Geri butonu
        var prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.innerHTML = "< Geri";
        prevBtn.disabled = (current <= 1);
        prevBtn.addEventListener("click", function () { goToPage(current - 1); });
        paginationEl.appendChild(prevBtn);

        // Sayfa numaraları (maks 5 göster)
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (var p = startPage; p <= endPage; p++) {
            var pageBtn = document.createElement("button");
            pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
            pageBtn.textContent = p;
            pageBtn.setAttribute("data-page", p);
            pageBtn.addEventListener("click", (function (pageNum) {
                return function () { goToPage(pageNum); };
            })(p));
            paginationEl.appendChild(pageBtn);
        }

        // Sonraki butonu
        var nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.innerHTML = "İleri >";
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToPage(current + 1); });
        paginationEl.appendChild(nextBtn);
    }

    function renderTotalCount() {
        var total = state.filteredOrgs.length;
        totalCountEl.innerHTML = "Toplam: <strong>" + total + "</strong> Organizasyon";
    }

    function updateSortIcons() {
        var allIcons = $$(".sort-icon");
        for (var i = 0; i < allIcons.length; i++) {
            allIcons[i].classList.remove("active");
            allIcons[i].textContent = "▲";
        }

        var key = state.tableSort.key;
        var dir = state.tableSort.dir;
        var icon = $("#sort-icon-" + key);
        if (icon) {
            icon.classList.add("active");
            icon.textContent = dir === "asc" ? "▲" : "▼";
        }
    }

    function sortBy(key) {
        if (state.tableSort.key === key) {
            state.tableSort.dir = state.tableSort.dir === "asc" ? "desc" : "asc";
        } else {
            state.tableSort.key = key;
            state.tableSort.dir = "asc";
        }
        state.tablePage = 1;
        applyFiltersAndRender();
    }

    function searchOrgs(q) {
        state.searchQuery = q;
        state.tablePage = 1;
        applyFiltersAndRender();
    }

    function changePageSize(n) {
        state.tablePageSize = parseInt(n, 10) || 5;
        state.tablePage = 1;
        applyFiltersAndRender();
    }

    function goToPage(n) {
        var totalPages = Math.max(1, Math.ceil(state.filteredOrgs.length / state.tablePageSize));
        if (n < 1 || n > totalPages) return;
        state.tablePage = n;
        applyFiltersAndRender();
    }

    // ─── Drawer ────────────────────────────────────────────────────────
    function openDrawer(orgId) {
        var org = findOrg(orgId);
        if (!org) return;

        state.activeOrgId = orgId;
        state.drawerOpen = true;

        drawerTitle.textContent = org.name || "Organizasyon";
        drawerSubtitle.textContent = "Simülasyon ayarlarını yapılandırın";

        // Formu doldur
        var tenantField = document.getElementById("tenant_id");
        if (tenantField) tenantField.value = org.id;
        var appNameField = document.getElementById("app_name");
        if (appNameField && !appNameField.value) appNameField.value = org.name;

        drawerEl.classList.add("open");
        drawerOverlay.classList.add("open");

        logEntry("Organizasyon seçildi: " + org.name, "info");
        renderTable(); // selected vurgusu
    }

    function closeDrawer() {
        state.drawerOpen = false;
        drawerEl.classList.remove("open");
        drawerOverlay.classList.remove("open");
    }

    // ─── Tab Switching ─────────────────────────────────────────────────
    function switchTab(name) {
        state.currentTab = name;

        // Tüm tab content'leri gizle
        var contents = $$(".tab-content");
        for (var i = 0; i < contents.length; i++) {
            contents[i].classList.remove("active");
        }

        // Seçili tab'ı göster
        var targetContent = $("#content-" + name);
        if (targetContent) targetContent.classList.add("active");

        // Sayfa başlığını güncelle
        updatePageTitle();
    }

    function updatePageTitle() {
        var titles = {
            overview: "Organizasyonlar",
            devices: "Cihazlar",
            settings: "Ayarlar"
        };
        if (pageTitleBar) {
            pageTitleBar.textContent = titles[state.currentTab] || "Genel Bakış";
        }
    }

    // ─── Nav Group Toggle ──────────────────────────────────────────────
    function toggleNavGroup(groupId) {
        var groupHeader = document.querySelector('[data-group="' + groupId + '"]');
        if (!groupHeader) return;
        var group = groupHeader.closest(".secondary-nav-group");
        if (group) group.classList.toggle("open");
    }

    // ─── Theme Toggle ──────────────────────────────────────────────────
    function toggleTheme() {
        document.body.classList.toggle("light-theme");
        var isLight = document.body.classList.contains("light-theme");
        themeToggle.textContent = isLight ? "☀" : "🌙";
    }

    // ─── Sidebar Toggle (Mobile) ───────────────────────────────────────
    function toggleSecondarySidebar() {
        secondarySidebar.classList.toggle("open");
    }

    // ─── Helpers ───────────────────────────────────────────────────────
    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function findOrg(id) {
        for (var i = 0; i < state.organizations.length; i++) {
            if (state.organizations[i].id === id) return state.organizations[i];
        }
        return null;
    }

    // ─── Form Fields Config ────────────────────────────────────────────
    var formFields = [
        { id: "tenant_id",              key: "tenant_id",              type: "string" },
        { id: "app_name",               key: "app_name",               type: "string" },
        { id: "device_prefix",          key: "device_prefix",          type: "string" },
        { id: "duration",               key: "duration",               type: "string" },
        { id: "activation_time",        key: "activation_time",        type: "string" },
        { id: "device_count",           key: "device_count",           type: "int" },
        { id: "gateway_count",          key: "gateway_count",          type: "int" },
        { id: "uplink_interval",        key: "uplink_interval",        type: "string" },
        { id: "f_port",                 key: "f_port",                 type: "int" },
        { id: "payload",                key: "payload",                type: "string" },
        { id: "frequency",              key: "frequency",              type: "int" },
        { id: "bandwidth",              key: "bandwidth",              type: "int" },
        { id: "spreading_factor",       key: "spreading_factor",       type: "int" },
        { id: "event_topic_template",   key: "event_topic_template",   type: "string" },
        { id: "command_topic_template", key: "command_topic_template", type: "string" }
    ];

    function loadConfigIntoForm(cfg) {
        if (!cfg) cfg = {};
        for (var i = 0; i < formFields.length; i++) {
            var f = formFields[i];
            var el = document.getElementById(f.id);
            if (!el) continue;
            var val = cfg[f.key];
            if (val !== undefined && val !== null && val !== "") {
                el.value = val;
            } else {
                el.value = el.defaultValue || "";
            }
        }
    }

    function collectConfig() {
        var cfg = {};
        for (var i = 0; i < formFields.length; i++) {
            var f = formFields[i];
            var el = document.getElementById(f.id);
            if (!el) continue;
            var val = el.value.trim();
            if (val === "") continue;
            if (f.type === "int") {
                cfg[f.key] = parseInt(val, 10);
            } else {
                cfg[f.key] = val;
            }
        }
        return cfg;
    }

    // ─── Modal Controls ────────────────────────────────────────────────
    function showAddModal() {
        modalOrgName.value = "";
        modalOrgDesc.value = "";
        modalOverlay.style.display = "flex";
        setTimeout(function () { modalOrgName.focus(); }, 100);
    }

    function hideAddModal() {
        modalOverlay.style.display = "none";
    }

    async function handleModalSave() {
        var name = modalOrgName.value.trim();
        var desc = modalOrgDesc.value.trim();

        if (!name) {
            showToast("Organizasyon adı zorunludur!", "error");
            modalOrgName.focus();
            return;
        }

        modalSave.disabled = true;
        modalSave.textContent = "Oluşturuluyor...";

        var ok = await createOrganization(name, desc);

        modalSave.disabled = false;
        modalSave.textContent = "Kaydet";

        if (ok) {
            hideAddModal();
        }
    }

    // ─── Start Simulation ──────────────────────────────────────────────
    async function startSimulation() {
        if (!state.activeOrgId) {
            showToast("Lütfen bir organizasyon seçin!", "error");
            return;
        }

        var cfg = collectConfig();

        if (!cfg.tenant_id) {
            showToast("Tenant ID zorunludur!", "error");
            var tenantField = document.getElementById("tenant_id");
            if (tenantField) tenantField.focus();
            return;
        }

        btnStart.disabled = true;
        logEntry("Simülasyon başlatılıyor...", "info");

        var r = await api("POST", "/api/start", cfg);

        if (r.ok) {
            logEntry("Başlatma isteği gönderildi.", "success");
            showToast("Simülasyon başlatılıyor...", "success");
            startPolling();
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Başlatma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            btnStart.disabled = false;
        }
    }

    // ─── Stop Simulation ───────────────────────────────────────────────
    async function stopSimulation() {
        btnStop.disabled = true;
        logEntry("Simülasyon durduruluyor...", "info");

        var r = await api("POST", "/api/stop");

        if (r.ok) {
            logEntry("Durdurma isteği gönderildi.", "success");
            showToast("Simülasyon durduruluyor...", "success");
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Durdurma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            btnStop.disabled = false;
        }
    }

    // ─── Event Bindings ────────────────────────────────────────────────

    // Secondary sidebar nav (active ones)
    $$(".secondary-nav-link[data-tab]").forEach(function (link) {
        link.addEventListener("click", function () {
            var tab = this.getAttribute("data-tab");
            if (tab) switchTab(tab);
        });
    });

    // Nav group toggle
    $$(".secondary-nav-group-header").forEach(function (header) {
        header.addEventListener("click", function () {
            toggleNavGroup(this.getAttribute("data-group"));
        });
    });

    // Table sort
    $$(".data-table thead th.sortable").forEach(function (th) {
        th.addEventListener("click", function () {
            sortBy(this.getAttribute("data-sort"));
        });
    });

    // Search
    searchInput.addEventListener("input", function () {
        searchOrgs(this.value);
    });

    // Page size
    pageSizeSelect.addEventListener("change", function () {
        changePageSize(this.value);
    });

    // Refresh
    btnRefresh.addEventListener("click", function () {
        fetchOrganizations();
    });

    // Add org
    btnAddOrg.addEventListener("click", function () {
        showAddModal();
    });

    // Modal
    modalClose.addEventListener("click", hideAddModal);
    modalCancel.addEventListener("click", hideAddModal);
    modalSave.addEventListener("click", handleModalSave);
    modalOverlay.addEventListener("click", function (e) {
        if (e.target === modalOverlay) hideAddModal();
    });
    modalOrgDesc.addEventListener("keydown", function (e) {
        if (e.key === "Enter") handleModalSave();
    });
    modalOrgName.addEventListener("keydown", function (e) {
        if (e.key === "Enter") modalOrgDesc.focus();
    });

    // Drawer
    drawerClose.addEventListener("click", closeDrawer);
    drawerOverlay.addEventListener("click", closeDrawer);

    // Start / Stop
    btnStart.addEventListener("click", startSimulation);
    btnStop.addEventListener("click", stopSimulation);

    // Theme
    themeToggle.addEventListener("click", toggleTheme);

    // Hamburger (mobile)
    hamburgerBtn.addEventListener("click", toggleSecondarySidebar);

    // ─── Init ──────────────────────────────────────────────────────────
    async function init() {
        logEntry("Sistem başlatılıyor...", "info");

        // Health check
        var online = await checkHealth();
        if (online) {
            logEntry("API bağlantısı kuruldu.", "success");
        } else {
            logEntry("API'ye bağlanılamadı! Sunucu çalışıyor mu?", "error");
        }

        // Load organizations from ChirpStack API
        await fetchOrganizations();

        // Load current state
        await pollStatus();
        startPolling();
    }

    init();
})();
