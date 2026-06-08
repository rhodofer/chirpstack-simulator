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
    var sidebarCloseBtn   = $("#sidebar-close-btn");
    var versionText       = $("#version-text");

    // Top bar
    var connectionBadge   = $("#connection-badge");
    var statusBadge       = $("#status-badge");
    var uptimeBadge       = $("#uptime-badge");
    var themeToggle       = $("#theme-toggle");

    // Org Table
    var orgTableBody      = $("#org-table-body");
    var emptyState        = $("#empty-state");
    var totalCountEl      = $("#total-count");
    var searchInput       = $("#search-input");
    var btnRefresh        = $("#btn-refresh");
    var pageSizeSelect    = $("#page-size-select");
    var paginationEl      = $("#pagination");

    // Buttons
    var btnAddOrg         = $("#btn-add-org");
    var btnStart          = null;
    var btnStop           = null;
    var btnTopStart       = $("#btn-top-start");
    var btnTopStop        = $("#btn-top-stop");
    var btnSaveOrgConfig  = $("#btn-save-org-config");

    // Bottom Console
    var bottomConsole     = $("#bottom-console");
    var btnConsoleClear   = $("#btn-console-clear");
    var btnConsoleToggle  = $("#btn-console-toggle");
    var consoleLogContainer = $("#console-log-container");
    var consoleResizeHandle = $("#console-resize-handle");

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
    var modalOrgId        = $("#modal-org-id");
    var btnRandomId       = $("#btn-random-id");
    var modalOrgDesc      = $("#modal-org-desc");
    var modalClose        = $("#modal-close");
    var modalCancel       = $("#modal-cancel");
    var modalSave         = $("#modal-save");

    // Device Profile tab
    var dpTableBody         = $("#dp-table-body");
    var dpEmptyState        = $("#dp-empty-state");
    var dpTotalCountEl      = $("#dp-total-count");
    var dpSearchInput       = $("#dp-search-input");
    var btnDpRefresh        = $("#btn-dp-refresh");
    var dpPageSizeSelect    = $("#dp-page-size-select");
    var dpPaginationEl      = $("#dp-pagination");
    var dpTenantFilter      = $("#dp-tenant-select");
    var btnAddDp            = $("#btn-add-dp");
    var dpModalOverlay      = $("#dp-modal-overlay");
    var dpName              = $("#dp-name");
    var dpTenant            = $("#dp-tenant");
    var dpDescription       = $("#dp-description");
    var dpRegion            = $("#dp-region");
    var dpMacVersion        = $("#dp-mac-version");
    var dpRegParams         = $("#dp-reg-params");
    var dpAdrAlg            = $("#dp-adr-alg");
    var dpSupportsOtaa      = $("#dp-supports-otaa");
    var dpSupportsClassB    = $("#dp-supports-class-b");
    var dpSupportsClassC    = $("#dp-supports-class-c");
    var dpModalClose        = $("#dp-modal-close");
    var dpModalCancel       = $("#dp-modal-cancel");
    var dpModalSave         = $("#dp-modal-save");

    // Settings tab
    var statServerStatus  = $("#stat-server-status");
    var statServerVersion = $("#stat-server-version");
    var statSimStatus     = $("#stat-sim-status");
    var statUptime        = $("#stat-uptime");

    // Log & Toast
    var logContainer      = $("#log-container");
    var toast             = $("#toast");
    // Networks DOM refs
    var btnAddNet           = $("#btn-add-net");
    var netTenantFilter     = $("#net-tenant-select");
    var netSearchInput      = $("#net-search-input");
    var btnNetRefresh       = $("#btn-net-refresh");
    var netPageSizeSelect   = $("#net-page-size-select");
    var netTableBody        = $("#net-table-body");
    var netEmptyState       = $("#net-empty-state");
    var netTotalCountEl     = $("#net-total-count");
    var netPaginationEl     = $("#net-pagination");
    var netModalOverlay     = $("#net-modal-overlay");
    var netName             = $("#net-name");
    var netTenant           = $("#net-tenant");
    var netDescription      = $("#net-description");
    var netModalClose       = $("#net-modal-close");
    var netModalCancel      = $("#net-modal-cancel");
    var netModalSave        = $("#net-modal-save");

    // Devices DOM refs
    var btnAddDev           = $("#btn-add-dev");
    var devTenantFilter     = $("#dev-tenant-select");
    var devSearchInput      = $("#dev-search-input");
    var btnDevRefresh       = $("#btn-dev-refresh");
    var devPageSizeSelect   = $("#dev-page-size-select");
    var devTableBody        = $("#dev-table-body");
    var devEmptyState       = $("#dev-empty-state");
    var devTotalCountEl     = $("#dev-total-count");
    var devPaginationEl     = $("#dev-pagination");
    var devModalOverlay     = $("#dev-modal-overlay");
    var devEui              = $("#dev-eui");
    var btnRandomDevEui     = $("#btn-random-dev-eui");
    var devName             = $("#dev-name");
    var devApp              = $("#dev-app");
    var devProfile          = $("#dev-profile");
    var devDescription      = $("#dev-description");
    var devModalClose       = $("#dev-modal-close");
    var devModalCancel      = $("#dev-modal-cancel");
    var devModalSave        = $("#dev-modal-save");

    // Login references
    var loginOverlay      = $("#login-overlay");
    var loginForm         = $("#login-form");
    var loginUsername     = $("#login-username");
    var loginPassword     = $("#login-password");
    var loginError        = $("#login-error");
    var btnLoginSubmit    = $("#btn-login-submit");
    var btnLogout         = $("#logout-btn");

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
        currentStatus: "idle",
        dpList: [],
        dpFiltered: [],
        dpSort: { key: "name", dir: "asc" },
        dpPage: 1,
        dpPageSize: 5,
        dpSearchQuery: "",
        dpTenantFilter: "",
        netList: [],
        netFiltered: [],
        netSort: { key: "name", dir: "asc" },
        netPage: 1,
        netPageSize: 5,
        netSearchQuery: "",
        netTenantFilter: "",
        devList: [],
        devFiltered: [],
        devSort: { key: "name", dir: "asc" },
        devPage: 1,
        devPageSize: 5,
        devSearchQuery: "",
        devTenantFilter: "",
        applications: [],
        appFiltered: [],
        appSearchQuery: "",
        appSort: { key: "name", dir: "asc" },
        appPage: 1,
        appPageSize: 5
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
            if (resp.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/status") {
                showLoginScreen();
            }
            var data = await resp.json();
            return { ok: resp.ok, status: resp.status, data: data };
        } catch (err) {
            return { ok: false, status: 0, data: { error: err.message } };
        }
    }

    // ─── API helper: fetch applications ────────────────────────────────────────
    async function fetchApplications(tenantId) {
        var url = "/api/applications";
        if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
        const r = await api("GET", url);
        if (r.ok) {
            const data = r.data;
            state.applications = data.applications || [];
            logEntry("Uygulama listesi alındı: " + state.applications.length + " adet", "success");
            applyAppFiltersAndRender();
            return true;
        } else {
            const err = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Uygulama listesi alınamadı: " + err, "error");
            showToast(err, "error");
            return false;
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
        if (btnStart) btnStart.disabled = isRunning || !state.activeOrgId;
        if (btnStop) btnStop.disabled  = !isRunning;
        if (btnTopStart) btnTopStart.disabled = isRunning || !state.activeOrgId;
        if (btnTopStop) btnTopStop.disabled  = !isRunning;
        updateFormInputsState();

        // Update console dot and expand when running
        var consoleDot = $(".console-dot");
        if (consoleDot) {
            if (isRunning) {
                consoleDot.classList.add("active");
                if (bottomConsole && bottomConsole.classList.contains("collapsed")) {
                    bottomConsole.classList.remove("collapsed");
                    bottomConsole.classList.add("expanded");
                    if (btnConsoleToggle) btnConsoleToggle.textContent = "Daralt";
                    var savedHeight = localStorage.getItem("console-height") || "320px";
                    bottomConsole.style.height = savedHeight;
                }
            } else {
                consoleDot.classList.remove("active");
            }
        }

        // Toggle active-simulation style on bottom console
        if (bottomConsole) {
            if (isRunning) {
                bottomConsole.classList.add("active-simulation");
            } else {
                bottomConsole.classList.remove("active-simulation");
            }
        }

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

    async function saveOrgConfig(orgId) {
        if (!orgId) return;
        var tenantEl = document.getElementById("tenant_id");
        var appNameEl = document.getElementById("app_name");
        var devPrefixEl = document.getElementById("device_prefix");
        var devCountEl = document.getElementById("device_count");
        var gwCountEl = document.getElementById("gateway_count");

        // global settings
        var durationEl = document.getElementById("duration");
        var actTimeEl = document.getElementById("activation_time");
        var uplinkEl = document.getElementById("uplink_interval");
        var fPortEl = document.getElementById("f_port");
        var payloadEl = document.getElementById("payload");
        var freqEl = document.getElementById("frequency");
        var bwEl = document.getElementById("bandwidth");
        var sfEl = document.getElementById("spreading_factor");
        var eventEl = document.getElementById("event_topic_template");
        var cmdEl = document.getElementById("command_topic_template");

        var data = {
            tenant_id: tenantEl ? tenantEl.value.trim() : orgId,
            app_name: appNameEl ? appNameEl.value.trim() : "",
            device_prefix: devPrefixEl ? devPrefixEl.value.trim() : "sim-dev",
            device_count: parseInt(devCountEl ? devCountEl.value : "5", 10),
            gateway_count: parseInt(gwCountEl ? gwCountEl.value : "2", 10),
            duration: durationEl ? durationEl.value.trim() : "5m",
            activation_time: actTimeEl ? actTimeEl.value.trim() : "1m",
            uplink_interval: uplinkEl ? uplinkEl.value.trim() : "5m",
            f_port: parseInt(fPortEl ? fPortEl.value : "10", 10),
            payload: payloadEl ? payloadEl.value.trim() : "010203",
            frequency: parseInt(freqEl ? freqEl.value : "868100000", 10),
            bandwidth: parseInt(bwEl ? bwEl.value : "125000", 10),
            spreading_factor: parseInt(sfEl ? sfEl.value : "7", 10),
            event_topic_template: eventEl ? eventEl.value.trim() : "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
            command_topic_template: cmdEl ? cmdEl.value.trim() : "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"
        };

        var btnSave = document.getElementById("btn-save-org-config");
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = "Kaydediliyor...";
        }

        var r = await api("POST", "/api/org-configs/" + orgId, data);
        
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.textContent = "✓ Ayarları Kaydet";
        }

        if (r.ok) {
            logEntry("Ayarlar sunucu veritabanına (SQLite) başarıyla kaydedildi.", "success");
            showToast("Ayarlar başarıyla kaydedildi.", "success");
            closeDrawer();
        } else {
            var errMsg = (r.data && r.data.error) || "Kaydetme hatası";
            logEntry("Ayarlar kaydedilemedi: " + errMsg, "error");
            showToast("Kaydetme hatası: " + errMsg, "error");
        }
    }

    async function loadOrgConfig(orgId, orgName) {
        if (!orgId) return;

        var tenantField = document.getElementById("tenant_id");
        var appNameField = document.getElementById("app_name");
        var devPrefixField = document.getElementById("device_prefix");
        var devCountField = document.getElementById("device_count");
        var gwCountField = document.getElementById("gateway_count");

        // global settings
        var durationField = document.getElementById("duration");
        var actTimeField = document.getElementById("activation_time");
        var uplinkField = document.getElementById("uplink_interval");
        var fPortField = document.getElementById("f_port");
        var payloadField = document.getElementById("payload");
        var freqField = document.getElementById("frequency");
        var bwField = document.getElementById("bandwidth");
        var sfField = document.getElementById("spreading_factor");
        var eventField = document.getElementById("event_topic_template");
        var cmdField = document.getElementById("command_topic_template");

        var r = await api("GET", "/api/org-configs/" + orgId);
        if (r.ok && r.data && r.data.tenant_id) {
            var data = r.data;
            if (tenantField) tenantField.value = data.tenant_id || orgId;
            if (appNameField) appNameField.value = data.app_name || orgName || "";
            if (devPrefixField) devPrefixField.value = data.device_prefix || "sim-dev";
            if (devCountField) devCountField.value = data.device_count || "5";
            if (gwCountField) gwCountField.value = data.gateway_count || "2";

            // global settings
            if (durationField) durationField.value = data.duration || "5m";
            if (actTimeField) actTimeField.value = data.activation_time || "1m";
            if (uplinkField) uplinkField.value = data.uplink_interval || "5m";
            if (fPortField) fPortField.value = data.f_port || "10";
            if (payloadField) payloadField.value = data.payload || "010203";
            if (freqField) freqField.value = data.frequency || "868100000";
            if (bwField) bwField.value = data.bandwidth || "125000";
            if (sfField) sfField.value = data.spreading_factor || "7";
            if (eventField) eventField.value = data.event_topic_template || "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}";
            if (cmdField) cmdField.value = data.command_topic_template || "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}";
            return;
        }

        // Fallback/defaults if no saved config in SQLite
        if (tenantField) tenantField.value = orgId;
        if (appNameField) appNameField.value = orgName || "";
        if (devPrefixField) devPrefixField.value = "sim-dev";
        if (devCountField) devCountField.value = "5";
        if (gwCountField) gwCountField.value = "2";

        var generalFields = ["duration", "activation_time", "frequency", "bandwidth", "spreading_factor", "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload"];
        generalFields.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                var localVal = localStorage.getItem("setting-" + id);
                el.value = localVal !== null ? localVal : el.defaultValue || "";
            }
        });
    }

    function updateFormInputsState() {
        var isSimRunning = (state.currentStatus === "running" || state.currentStatus === "starting");

        // Drawer form inputs
        var drawerInputs = [
            "tenant_id", "app_name", "device_prefix", "device_count", "gateway_count"
        ];
        drawerInputs.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = isSimRunning;
        });

        // Global settings form inputs
        var settingsInputs = [
            "duration", "activation_time", "frequency", "bandwidth", "spreading_factor",
            "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload"
        ];
        settingsInputs.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = isSimRunning;
        });

        // Save buttons
        if (btnSaveOrgConfig) btnSaveOrgConfig.disabled = isSimRunning;
    }

    async function selectDefaultOrgIfNone() {
        if (state.organizations.length > 0 && !state.activeOrgId) {
            var org = state.organizations[0];
            state.activeOrgId = org.id;
            await loadOrgConfig(org.id, org.name);
            updateFormInputsState();
            if (btnTopStart) btnTopStart.disabled = (state.currentStatus === "running" || state.currentStatus === "starting");
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
        populateDpFilterTenantSelect();
        populateNetFilterTenantSelect();
        populateDevFilterTenantSelect();
        await selectDefaultOrgIfNone();
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

    // ─── Device Profile API ────────────────────────────────────────────
    async function fetchDeviceProfiles(tenantId) {
        var url = "/api/device-profiles";
        if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
        var r = await api("GET", url);
        if (r.ok && r.data.device_profiles) {
            state.dpList = r.data.device_profiles;
        } else {
            state.dpList = [];
            var errMsg = (r.data && r.data.error) || "Bağlantı hatası";
            logEntry("Device profilleri yüklenemedi: " + errMsg, "error");
        }
        applyDpFiltersAndRender();
    }

    async function createDeviceProfile(data) {
        var r = await api("POST", "/api/device-profiles", data);
        if (r.ok) {
            var dp = r.data;
            logEntry("Yeni device profile oluşturuldu: " + dp.name + " (ID: " + dp.id + ")", "success");
            showToast("'" + dp.name + "' profili oluşturuldu.", "success");
            await fetchDeviceProfiles(state.dpTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Device profile oluşturma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            return false;
        }
    }

    // ─── Device Profile Table: Filter, Sort, Paginate, Render ─────────
    function applyDpFiltersAndRender() {
        var q = state.dpSearchQuery.toLowerCase();
        if (q) {
            state.dpFiltered = state.dpList.filter(function (dp) {
                return (dp.name && dp.name.toLowerCase().indexOf(q) !== -1) ||
                       (dp.region && dp.region.toLowerCase().indexOf(q) !== -1);
            });
        } else {
            state.dpFiltered = state.dpList.slice();
        }
        var sk = state.dpSort.key;
        var sd = state.dpSort.dir === "asc" ? 1 : -1;
        state.dpFiltered.sort(function (a, b) {
            var va = (a[sk] || "").toString().toLowerCase();
            var vb = (b[sk] || "").toString().toLowerCase();
            if (va < vb) return -1 * sd;
            if (va > vb) return 1 * sd;
            return 0;
        });
        var totalPages = Math.max(1, Math.ceil(state.dpFiltered.length / state.dpPageSize));
        if (state.dpPage > totalPages) state.dpPage = totalPages;
        renderDpTable();
        renderDpPagination();
        renderDpTotalCount();
        updateDpSortIcons();
    }

    function renderDpTable() {
        dpTableBody.innerHTML = "";
        if (state.dpFiltered.length === 0) {
            dpEmptyState.style.display = "block";
            return;
        }
        dpEmptyState.style.display = "none";
        var start = (state.dpPage - 1) * state.dpPageSize;
        var end = Math.min(start + state.dpPageSize, state.dpFiltered.length);
        var pageItems = state.dpFiltered.slice(start, end);
        for (var i = 0; i < pageItems.length; i++) {
            var dp = pageItems[i];
            var tr = document.createElement("tr");
            tr.setAttribute("data-id", dp.id);
            tr.innerHTML =
                '<td><span class="org-name-primary">' + escapeHtml(dp.name) + '</span></td>' +
                '<td><span class="status-pill active">' + escapeHtml(dp.region || "—") + '</span></td>' +
                '<td><span class="id-cell">' + escapeHtml((dp.mac_version || "").replace("LORAWAN_", "")) + '</span></td>' +
                '<td>' + (dp.supports_otaa ? '✓' : '—') + '</td>' +
                '<td>' +
                    '<div class="row-actions">' +
                        '<button class="row-action-btn view-btn" data-id="' + dp.id + '" title="Görüntüle">👁</button>' +
                        '<button class="row-action-btn danger delete-btn" data-id="' + dp.id + '" title="Sil">🗑</button>' +
                    '</div>' +
                '</td>';
            tr.addEventListener("click", (function (id) {
                return function (e) {
                    if (e.target.closest(".delete-btn")) { e.stopPropagation(); deleteDeviceProfile(id); return; }
                    if (e.target.closest(".view-btn")) { e.stopPropagation(); viewDeviceProfile(id); return; }
                };
            })(dp.id));
            dpTableBody.appendChild(tr);
        }
    }

    function renderDpPagination() {
        dpPaginationEl.innerHTML = "";
        var total = state.dpFiltered.length;
        var totalPages = Math.max(1, Math.ceil(total / state.dpPageSize));
        var current = state.dpPage;
        var prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.innerHTML = "< Geri";
        prevBtn.disabled = (current <= 1);
        prevBtn.addEventListener("click", function () { goToDpPage(current - 1); });
        dpPaginationEl.appendChild(prevBtn);
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (var p = startPage; p <= endPage; p++) {
            var pageBtn = document.createElement("button");
            pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
            pageBtn.textContent = p;
            pageBtn.addEventListener("click", (function (pageNum) {
                return function () { goToDpPage(pageNum); };
            })(p));
            dpPaginationEl.appendChild(pageBtn);
        }
        var nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.innerHTML = "İleri >";
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToDpPage(current + 1); });
        dpPaginationEl.appendChild(nextBtn);
    }

    function renderDpTotalCount() {
        dpTotalCountEl.innerHTML = "Toplam: <strong>" + state.dpFiltered.length + "</strong> Profil";
    }

    function updateDpSortIcons() {
        var allIcons = $$("[id^='dp-sort-icon-']");
        for (var i = 0; i < allIcons.length; i++) {
            allIcons[i].classList.remove("active");
            allIcons[i].textContent = "▲";
        }
        var icon = $("#dp-sort-icon-" + state.dpSort.key);
        if (icon) {
            icon.classList.add("active");
            icon.textContent = state.dpSort.dir === "asc" ? "▲" : "▼";
        }
    }

    function goToDpPage(n) {
        var totalPages = Math.max(1, Math.ceil(state.dpFiltered.length / state.dpPageSize));
        if (n < 1 || n > totalPages) return;
        state.dpPage = n;
        applyDpFiltersAndRender();
    }

    function viewDeviceProfile(id) {
        var dp = findDp(id);
        if (!dp) return;
        alert(
            "ID: " + dp.id + "\n" +
            "Ad: " + dp.name + "\n" +
            "Tenant: " + dp.tenant_id + "\n" +
            "Bölge: " + dp.region + "\n" +
            "MAC: " + dp.mac_version + "\n" +
            "RegParams: " + dp.reg_params_revision + "\n" +
            "OTAA: " + (dp.supports_otaa ? "Evet" : "Hayır") + "\n" +
            "Class B: " + (dp.supports_class_b ? "Evet" : "Hayır") + "\n" +
            "Class C: " + (dp.supports_class_c ? "Evet" : "Hayır") + "\n" +
            "ADR: " + (dp.adr_algorithm_id || "default")
        );
    }

    // ─── Device Profile Modal ──────────────────────────────────────────
    function populateDpTenantSelect() {
        dpTenant.innerHTML = "";
        if (state.organizations.length === 0) {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Önce organizasyon oluşturun";
            opt.disabled = true;
            dpTenant.appendChild(opt);
            return;
        }
        for (var i = 0; i < state.organizations.length; i++) {
            var opt = document.createElement("option");
            opt.value = state.organizations[i].id;
            opt.textContent = state.organizations[i].name;
            dpTenant.appendChild(opt);
        }
    }

    function populateDpFilterTenantSelect() {
        var firstOpt = dpTenantFilter.querySelector('option[value=""]');
        dpTenantFilter.innerHTML = "";
        if (firstOpt) {
            dpTenantFilter.appendChild(firstOpt);
        } else {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Tüm Tenant'lar";
            dpTenantFilter.appendChild(opt);
        }
        for (var i = 0; i < state.organizations.length; i++) {
            var opt = document.createElement("option");
            opt.value = state.organizations[i].id;
            opt.textContent = state.organizations[i].name;
            dpTenantFilter.appendChild(opt);
        }
    }

    function populateNetFilterTenantSelect() {
        if (!netTenantFilter) return;
        var firstOpt = netTenantFilter.querySelector('option[value=""]');
        netTenantFilter.innerHTML = "";
        if (firstOpt) {
            netTenantFilter.appendChild(firstOpt);
        } else {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Tüm Tenant'lar";
            netTenantFilter.appendChild(opt);
        }
        for (var i = 0; i < state.organizations.length; i++) {
            var opt = document.createElement("option");
            opt.value = state.organizations[i].id;
            opt.textContent = state.organizations[i].name;
            netTenantFilter.appendChild(opt);
        }
    }

    function showDpModal() {
        dpName.value = "";
        dpDescription.value = "";
        dpRegion.value = "EU868";
        dpMacVersion.value = "LORAWAN_1_0_3";
        dpRegParams.value = "B";
        dpAdrAlg.value = "default";
        dpSupportsOtaa.checked = true;
        dpSupportsClassB.checked = false;
        dpSupportsClassC.checked = false;
        populateDpTenantSelect();
        dpModalOverlay.style.display = "flex";
        setTimeout(function () { dpName.focus(); }, 100);
    }

    function hideDpModal() {
        dpModalOverlay.style.display = "none";
    }

    async function handleDpModalSave() {
        var name = dpName.value.trim();
        var tenantId = dpTenant.value;
        if (!name) { showToast("Profil adı zorunludur!", "error"); dpName.focus(); return; }
        if (!tenantId) { showToast("Tenant seçimi zorunludur!", "error"); return; }
        dpModalSave.disabled = true;
        dpModalSave.textContent = "Oluşturuluyor...";
        var data = {
            name: name,
            tenant_id: tenantId,
            description: dpDescription.value.trim(),
            region: dpRegion.value,
            mac_version: dpMacVersion.value,
            reg_params_revision: dpRegParams.value,
            adr_algorithm_id: dpAdrAlg.value || "default",
            supports_otaa: dpSupportsOtaa.checked,
            supports_class_b: dpSupportsClassB.checked,
            supports_class_c: dpSupportsClassC.checked
        };
        var ok = await createDeviceProfile(data);
        dpModalSave.disabled = false;
        dpModalSave.textContent = "Kaydet";
        if (ok) hideDpModal();
    }

    async function deleteDeviceProfile(id) {
        var dp = findDp(id);
        if (!dp) return;
        if (!confirm("'" + dp.name + "' profilini silmek istediğinize emin misiniz?")) return;
        var r = await api("DELETE", "/api/device-profiles/" + id);
        if (r.ok) {
            logEntry("Device profile silindi: " + dp.name, "success");
            showToast("'" + dp.name + "' silindi.", "success");
            await fetchDeviceProfiles(state.dpTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Device profile silme hatası: " + errMsg, "error");
            showToast(errMsg, "error");
        }
    }

    function findDp(id) {
        for (var i = 0; i < state.dpList.length; i++) {
            if (state.dpList[i].id === id) return state.dpList[i];
        }
        return null;
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
    async function openDrawer(orgId) {
        var org = findOrg(orgId);
        if (!org) return;

        state.activeOrgId = orgId;
        state.drawerOpen = true;

        drawerTitle.textContent = org.name || "Organizasyon";
        drawerSubtitle.textContent = "Simülasyon ayarlarını yapılandırın";

        // Formu doldur
        await loadOrgConfig(orgId, org.name);
        updateFormInputsState();

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

        // Sidebar linklerini güncelle
        $$(".secondary-nav-link").forEach(function (link) {
            if (link.getAttribute("data-tab") === name) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Sayfa başlığını güncelle
        updatePageTitle();
    }

    function updatePageTitle() {
        var titles = {
            overview: "Organizasyonlar",
            devices: "Device Profilleri",
            networks: "Ağ Uygulamaları",
            "device-list": "Cihazlar",
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
        localStorage.setItem("theme", isLight ? "light" : "dark");
    }

    // ─── Sidebar Toggle (Mobile) ───────────────────────────────────────
    function toggleSecondarySidebar() {
        secondarySidebar.classList.toggle("open");
        var isOpen = secondarySidebar.classList.contains("open");
        if (hamburgerBtn) {
            hamburgerBtn.textContent = isOpen ? "✕" : "☰";
        }
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
        var isSimRunning = (state.currentStatus === "running" || state.currentStatus === "starting");

        for (var i = 0; i < formFields.length; i++) {
            var f = formFields[i];
            var el = document.getElementById(f.id);
            if (!el) continue;
            var val = cfg[f.key];
            if (val !== undefined && val !== null && val !== "") {
                el.value = val;
            } else {
                var isGeneral = ["duration", "activation_time", "frequency", "bandwidth", "spreading_factor", "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload"].indexOf(f.id) !== -1;
                if (isGeneral && !isSimRunning) {
                    var localVal = localStorage.getItem("setting-" + f.id);
                    if (localVal !== null) {
                        el.value = localVal;
                        continue;
                    }
                }
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
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function showAddModal() {
        modalOrgName.value = "";
        modalOrgId.value = "";
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

        if (btnStart) btnStart.disabled = true;
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
            if (btnStart) btnStart.disabled = false;
        }
    }

    // ─── Stop Simulation ───────────────────────────────────────────────
    async function stopSimulation() {
        if (btnStop) btnStop.disabled = true;
        logEntry("Simülasyon durduruluyor...", "info");

        var r = await api("POST", "/api/stop");

        if (r.ok) {
            logEntry("Durdurma isteği gönderildi.", "success");
            showToast("Simülasyon durduruluyor...", "success");
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Durdurma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            if (btnStop) btnStop.disabled = false;
        }
    }

    // ─── Event Bindings ────────────────────────────────────────────────

    // Secondary sidebar nav (active ones)
    $$(".secondary-nav-link[data-tab]").forEach(function (link) {
        link.addEventListener("click", function () {
            var tab = this.getAttribute("data-tab");
            if (tab) switchTab(tab);
            if (window.innerWidth <= 900) {
                secondarySidebar.classList.remove("open");
                if (hamburgerBtn) hamburgerBtn.textContent = "☰";
            }
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
    if (btnRandomId) {
        btnRandomId.addEventListener("click", function () {
            modalOrgId.value = generateUUID();
            modalOrgId.focus();
        });
    }
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
    if (btnSaveOrgConfig) {
        btnSaveOrgConfig.addEventListener("click", async function (e) {
            e.preventDefault();
            
            var devCountEl = document.getElementById("device_count");
            var gwCountEl = document.getElementById("gateway_count");
            var appNameEl = document.getElementById("app_name");
            
            var devCount = parseInt(devCountEl ? devCountEl.value : "0", 10);
            var gwCount = parseInt(gwCountEl ? gwCountEl.value : "0", 10);
            var appName = appNameEl ? appNameEl.value.trim() : "";
            
            if (!appName) {
                showToast("Uygulama Adı zorunludur!", "error");
                if (appNameEl) appNameEl.focus();
                return;
            }
            if (isNaN(devCount) || devCount <= 0) {
                showToast("Cihaz Sayısı 0'dan büyük bir tam sayı olmalıdır!", "error");
                if (devCountEl) devCountEl.focus();
                return;
            }
            if (isNaN(gwCount) || gwCount <= 0) {
                showToast("Gateway Sayısı 0'dan büyük bir tam sayı olmalıdır!", "error");
                if (gwCountEl) gwCountEl.focus();
                return;
            }
            
            await saveOrgConfig(state.activeOrgId);
        });
    }

    // Start / Stop
    if (btnStart) btnStart.addEventListener("click", startSimulation);
    if (btnStop) btnStop.addEventListener("click", stopSimulation);

    // Theme
    themeToggle.addEventListener("click", toggleTheme);

    // Hamburger (mobile)
    hamburgerBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleSecondarySidebar();
    });
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            toggleSecondarySidebar();
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", function (e) {
        if (window.innerWidth <= 900) {
            if (secondarySidebar && secondarySidebar.classList.contains("open")) {
                if (!secondarySidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                    secondarySidebar.classList.remove("open");
                    if (hamburgerBtn) hamburgerBtn.textContent = "☰";
                }
            }
        }
    });

    // Device Profile table sort
    $$("#dp-table thead th.sortable").forEach(function (th) {
        th.addEventListener("click", function () {
            var key = this.getAttribute("data-sort");
            if (state.dpSort.key === key) {
                state.dpSort.dir = state.dpSort.dir === "asc" ? "desc" : "asc";
            } else {
                state.dpSort.key = key;
                state.dpSort.dir = "asc";
            }
            state.dpPage = 1;
            applyDpFiltersAndRender();
        });
    });

    // Device Profile search
    dpSearchInput.addEventListener("input", function () {
        state.dpSearchQuery = this.value;
        state.dpPage = 1;
        applyDpFiltersAndRender();
    });

    // Device Profile page size
    dpPageSizeSelect.addEventListener("change", function () {
        state.dpPageSize = parseInt(this.value, 10) || 5;
        state.dpPage = 1;
        applyDpFiltersAndRender();
    });

    // Device Profile refresh
    btnDpRefresh.addEventListener("click", function () {
        fetchDeviceProfiles(state.dpTenantFilter);
    });

    // Device Profile tenant filter
    dpTenantFilter.addEventListener("change", function () {
        state.dpTenantFilter = this.value;
        state.dpPage = 1;
        fetchDeviceProfiles(state.dpTenantFilter);
    });

    // Add device profile
    btnAddDp.addEventListener("click", showDpModal);

    // Device Profile modal
    dpModalClose.addEventListener("click", hideDpModal);
    dpModalCancel.addEventListener("click", hideDpModal);
    dpModalSave.addEventListener("click", handleDpModalSave);
    dpModalOverlay.addEventListener("click", function (e) {
        if (e.target === dpModalOverlay) hideDpModal();
    });

    // ─── Networks API ──────────────────────────────────────────────────
    async function createApplication(name, tenantId, description) {
        var r = await api("POST", "/api/applications", {
            name: name,
            tenant_id: tenantId,
            description: description || ""
        });
        if (r.ok) {
            var app = r.data;
            logEntry("Yeni uygulama oluşturuldu: " + app.name + " (ID: " + app.id + ")", "success");
            showToast("'" + app.name + "' uygulaması oluşturuldu.", "success");
            await fetchApplications(state.netTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Uygulama oluşturma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            return false;
        }
    }

    async function deleteApplication(id) {
        var app = findNet(id);
        if (!app) return;
        if (!confirm("'" + app.name + "' uygulamasını silmek istediğinize emin misiniz?")) return;
        var r = await api("DELETE", "/api/applications/" + id);
        if (r.ok) {
            logEntry("Uygulama silindi: " + app.name, "success");
            showToast("'" + app.name + "' silindi.", "success");
            await fetchApplications(state.netTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Uygulama silme hatası: " + errMsg, "error");
            showToast(errMsg, "error");
        }
    }

    function findNet(id) {
        for (var i = 0; i < state.applications.length; i++) {
            if (state.applications[i].id === id) return state.applications[i];
        }
        return null;
    }

    // ─── Application Table: Filter, Sort, Paginate, Render ─────────
    function applyAppFiltersAndRender() {
        const q = state.appSearchQuery.toLowerCase();
        if (q) {
            state.appFiltered = state.applications.filter(app =>
                (app.name && app.name.toLowerCase().includes(q)) ||
                (app.tenant_id && app.tenant_id.toLowerCase().includes(q)));
        } else {
            state.appFiltered = state.applications.slice();
        }
        const sk = state.appSort.key;
        const sd = state.appSort.dir === "asc" ? 1 : -1;
        state.appFiltered.sort((a, b) => {
            const va = (a[sk] || "").toString().toLowerCase();
            const vb = (b[sk] || "").toString().toLowerCase();
            if (va < vb) return -1 * sd;
            if (va > vb) return 1 * sd;
            return 0;
        });
        const totalPages = Math.max(1, Math.ceil(state.appFiltered.length / state.appPageSize));
        if (state.appPage > totalPages) state.appPage = totalPages;
        renderAppTable();
        renderAppPagination();
        renderAppTotalCount();
        updateAppSortIcons();
    }

    function renderAppTable() {
        netTableBody.innerHTML = "";
        if (state.appFiltered.length === 0) { netEmptyState.style.display = "block"; return; }
        netEmptyState.style.display = "none";
        const start = (state.appPage - 1) * state.appPageSize;
        const end = Math.min(start + state.appPageSize, state.appFiltered.length);
        const pageItems = state.appFiltered.slice(start, end);
        for (let i = 0; i < pageItems.length; i++) {
            const app = pageItems[i];
            const tr = document.createElement("tr");
            tr.setAttribute("data-id", app.id);
            tr.innerHTML =
                `<td><span class="org-name-primary">${escapeHtml(app.name)}</span></td>` +
                `<td><span class="status-pill active">${escapeHtml(app.tenant_id || "—")}</span></td>` +
                `<td><div class="row-actions"><button class="row-action-btn view-btn" data-id="${app.id}" title="Görüntüle">👁</button>` +
                `<button class="row-action-btn danger delete-btn" data-id="${app.id}" title="Sil">🗑</button></div></td>`;
            tr.addEventListener("click", (e) => {
                if (e.target.closest(".delete-btn")) { e.stopPropagation(); deleteApplication(app.id); return; }
            });
            netTableBody.appendChild(tr);
        }
    }

    function renderAppPagination() {
        netPaginationEl.innerHTML = "";
        var total = state.appFiltered.length;
        var totalPages = Math.max(1, Math.ceil(total / state.appPageSize));
        var current = state.appPage;
        var prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.innerHTML = "< Geri";
        prevBtn.disabled = (current <= 1);
        prevBtn.addEventListener("click", function () { goToAppPage(current - 1); });
        netPaginationEl.appendChild(prevBtn);
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (var p = startPage; p <= endPage; p++) {
            var pageBtn = document.createElement("button");
            pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
            pageBtn.textContent = p;
            pageBtn.addEventListener("click", (function (pageNum) {
                return function () { goToAppPage(pageNum); };
            })(p));
            netPaginationEl.appendChild(pageBtn);
        }
        var nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.innerHTML = "İleri >";
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToAppPage(current + 1); });
        netPaginationEl.appendChild(nextBtn);
    }

    function renderAppTotalCount() {
        netTotalCountEl.innerHTML = "Toplam: <strong>" + state.appFiltered.length + "</strong> Uygulama";
    }

    function updateAppSortIcons() {
        var allIcons = $$("[id^='net-sort-icon-']");
        for (var i = 0; i < allIcons.length; i++) {
            allIcons[i].classList.remove("active");
            allIcons[i].textContent = "▲";
        }
        var icon = $("#net-sort-icon-" + state.appSort.key);
        if (icon) {
            icon.classList.add("active");
            icon.textContent = state.appSort.dir === "asc" ? "▲" : "▼";
        }
    }

    function goToAppPage(n) {
        var totalPages = Math.max(1, Math.ceil(state.appFiltered.length / state.appPageSize));
        if (n < 1 || n > totalPages) return;
        state.appPage = n;
        applyAppFiltersAndRender();
    }

    // ─── Devices API ───────────────────────────────────────────────────
    async function fetchDevices(tenantId) {
        var url = "/api/devices";
        if (tenantId) url += "?tenant_id=" + encodeURIComponent(tenantId);
        var r = await api("GET", url);
        if (r.ok && r.data.devices) {
            state.devList = r.data.devices;
        } else {
            state.devList = [];
            var errMsg = (r.data && r.data.error) || "Bağlantı hatası";
            logEntry("Cihazlar yüklenemedi: " + errMsg, "error");
        }
        applyDevFiltersAndRender();
    }

    async function createDevice(data) {
        var r = await api("POST", "/api/devices", data);
        if (r.ok) {
            var dev = r.data;
            logEntry("Yeni cihaz oluşturuldu: " + dev.name + " (EUI: " + dev.dev_eui + ")", "success");
            showToast("'" + dev.name + "' cihazı oluşturuldu.", "success");
            await fetchDevices(state.devTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Cihaz oluşturma hatası: " + errMsg, "error");
            showToast(errMsg, "error");
            return false;
        }
    }

    async function deleteDevice(devEui) {
        var dev = findDev(devEui);
        if (!dev) return;
        if (!confirm("'" + dev.name + "' cihazını silmek istediğinize emin misiniz?")) return;
        var r = await api("DELETE", "/api/devices/" + devEui);
        if (r.ok) {
            logEntry("Cihaz silindi: " + dev.name, "success");
            showToast("'" + dev.name + "' silindi.", "success");
            await fetchDevices(state.devTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Cihaz silme hatası: " + errMsg, "error");
            showToast(errMsg, "error");
        }
    }

    function findDev(devEui) {
        for (var i = 0; i < state.devList.length; i++) {
            if (state.devList[i].dev_eui === devEui) return state.devList[i];
        }
        return null;
    }

    // ─── Devices Table: Filter, Sort, Paginate, Render ─────────────────
    function applyDevFiltersAndRender() {
        var q = state.devSearchQuery.toLowerCase();
        if (q) {
            state.devFiltered = state.devList.filter(function (dev) {
                return (dev.name && dev.name.toLowerCase().indexOf(q) !== -1) ||
                       (dev.dev_eui && dev.dev_eui.toLowerCase().indexOf(q) !== -1);
            });
        } else {
            state.devFiltered = state.devList.slice();
        }
        var sk = state.devSort.key;
        var sd = state.devSort.dir === "asc" ? 1 : -1;
        state.devFiltered.sort(function (a, b) {
            var va = (a[sk] || "").toString().toLowerCase();
            var vb = (b[sk] || "").toString().toLowerCase();
            if (va < vb) return -1 * sd;
            if (va > vb) return 1 * sd;
            return 0;
        });
        var totalPages = Math.max(1, Math.ceil(state.devFiltered.length / state.devPageSize));
        if (state.devPage > totalPages) state.devPage = totalPages;
        renderDevTable();
        renderDevPagination();
        renderDevTotalCount();
        updateDevSortIcons();
    }

    function renderDevTable() {
        devTableBody.innerHTML = "";
        if (state.devFiltered.length === 0) {
            devEmptyState.style.display = "block";
            return;
        }
        devEmptyState.style.display = "none";
        var start = (state.devPage - 1) * state.devPageSize;
        var end = Math.min(start + state.devPageSize, state.devFiltered.length);
        var pageItems = state.devFiltered.slice(start, end);
        for (var i = 0; i < pageItems.length; i++) {
            var dev = pageItems[i];
            var tr = document.createElement("tr");
            tr.setAttribute("data-id", dev.dev_eui);
            tr.innerHTML =
                '<td><span class="org-name-primary">' + escapeHtml(dev.name) + '</span></td>' +
                '<td><span class="id-cell">' + escapeHtml(dev.dev_eui) + '</span></td>' +
                '<td><span class="id-cell">' + escapeHtml(dev.device_profile_id) + '</span></td>' +
                '<td>' +
                    '<div class="row-actions">' +
                        '<button class="row-action-btn danger delete-btn" data-id="' + dev.dev_eui + '" title="Sil">🗑</button>' +
                    '</div>' +
                '</td>';
            tr.addEventListener("click", (function (devEui) {
                return function (e) {
                    if (e.target.closest(".delete-btn")) { e.stopPropagation(); deleteDevice(devEui); return; }
                };
            })(dev.dev_eui));
            devTableBody.appendChild(tr);
        }
    }

    function renderDevPagination() {
        devPaginationEl.innerHTML = "";
        var total = state.devFiltered.length;
        var totalPages = Math.max(1, Math.ceil(total / state.devPageSize));
        var current = state.devPage;
        var prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.innerHTML = "< Geri";
        prevBtn.disabled = (current <= 1);
        prevBtn.addEventListener("click", function () { goToDevPage(current - 1); });
        devPaginationEl.appendChild(prevBtn);
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (var p = startPage; p <= endPage; p++) {
            var pageBtn = document.createElement("button");
            pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
            pageBtn.textContent = p;
            pageBtn.addEventListener("click", (function (pageNum) {
                return function () { goToDevPage(pageNum); };
            })(p));
            devPaginationEl.appendChild(pageBtn);
        }
        var nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.innerHTML = "İleri >";
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToDevPage(current + 1); });
        devPaginationEl.appendChild(nextBtn);
    }

    function renderDevTotalCount() {
        devTotalCountEl.innerHTML = "Toplam: <strong>" + state.devFiltered.length + "</strong> Cihaz";
    }

    function updateDevSortIcons() {
        var allIcons = $$("[id^='dev-sort-icon-']");
        for (var i = 0; i < allIcons.length; i++) {
            allIcons[i].classList.remove("active");
            allIcons[i].textContent = "▲";
        }
        var icon = $("#dev-sort-icon-" + state.devSort.key);
        if (icon) {
            icon.classList.add("active");
            icon.textContent = state.devSort.dir === "asc" ? "▲" : "▼";
        }
    }

    function goToDevPage(n) {
        var totalPages = Math.max(1, Math.ceil(state.devFiltered.length / state.devPageSize));
        if (n < 1 || n > totalPages) return;
        state.devPage = n;
        applyDevFiltersAndRender();
    }

    // ─── Devices Modal Controls ────────────────────────────────────────
    function populateDevAppSelect() {
        devApp.innerHTML = "";
        if (state.applications.length === 0) {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Önce uygulama oluşturun";
            opt.disabled = true;
            devApp.appendChild(opt);
            return;
        }
        for (var i = 0; i < state.applications.length; i++) {
            var opt = document.createElement("option");
            opt.value = state.applications[i].id;
            opt.textContent = state.applications[i].name;
            devApp.appendChild(opt);
        }
        onDevAppChange();
    }

    function populateDevFilterTenantSelect() {
        if (!devTenantFilter) return;
        var firstOpt = devTenantFilter.querySelector('option[value=""]');
        devTenantFilter.innerHTML = "";
        if (firstOpt) {
            devTenantFilter.appendChild(firstOpt);
        } else {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Tüm Tenant'lar";
            devTenantFilter.appendChild(opt);
        }
        for (var i = 0; i < state.organizations.length; i++) {
            var opt = document.createElement("option");
            opt.value = state.organizations[i].id;
            opt.textContent = state.organizations[i].name;
            devTenantFilter.appendChild(opt);
        }
    }

    function onDevAppChange() {
        var appId = devApp.value;
        devProfile.innerHTML = "";
        var app = findNet(appId);
        if (!app) {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Uygulama bulunamadı";
            opt.disabled = true;
            devProfile.appendChild(opt);
            return;
        }
        var tenantId = app.tenant_id;
        var filteredDps = state.dpList.filter(function (dp) {
            return dp.tenant_id === tenantId;
        });

        if (filteredDps.length === 0) {
            var opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Bu tenant için device profile yok";
            opt.disabled = true;
            devProfile.appendChild(opt);
            return;
        }

        for (var i = 0; i < filteredDps.length; i++) {
            var opt = document.createElement("option");
            opt.value = filteredDps[i].id;
            opt.textContent = filteredDps[i].name;
            devProfile.appendChild(opt);
        }
    }

    function showDevModal() {
        devEui.value = "";
        devName.value = "";
        devDescription.value = "";
        populateDevAppSelect();
        devModalOverlay.style.display = "flex";
        setTimeout(function () { devEui.focus(); }, 100);
    }

    function hideDevModal() {
        devModalOverlay.style.display = "none";
    }

    async function handleDevModalSave() {
        var eui = devEui.value.trim();
        var name = devName.value.trim();
        var appId = devApp.value;
        var dpId = devProfile.value;
        if (!eui || eui.length !== 16) { showToast("DevEUI 16 hex karakter olmalıdır!", "error"); devEui.focus(); return; }
        if (!name) { showToast("Cihaz adı zorunludur!", "error"); devName.focus(); return; }
        if (!appId) { showToast("Uygulama seçimi zorunludur!", "error"); return; }
        if (!dpId) { showToast("Device profile seçimi zorunludur!", "error"); return; }

        devModalSave.disabled = true;
        devModalSave.textContent = "Oluşturuluyor...";
        var ok = await createDevice({
            dev_eui: eui,
            name: name,
            application_id: appId,
            device_profile_id: dpId,
            description: devDescription.value.trim()
        });
        devModalSave.disabled = false;
        devModalSave.textContent = "Kaydet";
        if (ok) hideDevModal();
    }

    function generateRandomDevEUI() {
        var hex = "0123456789abcdef";
        var res = "";
        for (var i = 0; i < 16; i++) {
            res += hex.charAt(Math.floor(Math.random() * 16));
        }
        return res;
    }

    // ─── Event Bindings for Networks & Devices ─────────────────────────
    function bindNetAndDevEvents() {
        netSearchInput.addEventListener("input", function () {
            state.appSearchQuery = this.value;
            state.appPage = 1;
            applyAppFiltersAndRender();
        });

        netPageSizeSelect.addEventListener("change", function () {
            state.appPageSize = parseInt(this.value, 10) || 10;
            state.appPage = 1;
            applyAppFiltersAndRender();
        });

        btnNetRefresh.addEventListener("click", function () {
            fetchApplications(state.netTenantFilter);
        });

        if (netTenantFilter) {
            netTenantFilter.addEventListener("change", function () {
                state.netTenantFilter = this.value;
                state.appPage = 1;
                fetchApplications(state.netTenantFilter);
            });
        }

        // Network table sort
        $$("#net-table thead th.sortable").forEach(function (th) {
            th.addEventListener("click", function () {
                var key = this.getAttribute("data-sort");
                if (state.appSort.key === key) {
                    state.appSort.dir = state.appSort.dir === "asc" ? "desc" : "asc";
                } else {
                    state.appSort.key = key;
                    state.appSort.dir = "asc";
                }
                state.appPage = 1;
                applyAppFiltersAndRender();
            });
        });

        btnAddDev.addEventListener("click", showDevModal);

        btnRandomDevEui.addEventListener("click", function () {
            devEui.value = generateRandomDevEUI();
        });

        devApp.addEventListener("change", onDevAppChange);

        devModalClose.addEventListener("click", hideDevModal);
        devModalCancel.addEventListener("click", hideDevModal);
        devModalSave.addEventListener("click", handleDevModalSave);
        devModalOverlay.addEventListener("click", function (e) {
            if (e.target === devModalOverlay) hideDevModal();
        });

        devSearchInput.addEventListener("input", function () {
            state.devSearchQuery = this.value;
            state.devPage = 1;
            applyDevFiltersAndRender();
        });

        devPageSizeSelect.addEventListener("change", function () {
            state.devPageSize = parseInt(this.value, 10) || 5;
            state.devPage = 1;
            applyDevFiltersAndRender();
        });

        btnDevRefresh.addEventListener("click", function () {
            fetchDevices(state.devTenantFilter);
        });

        if (devTenantFilter) {
            devTenantFilter.addEventListener("change", function () {
                state.devTenantFilter = this.value;
                state.devPage = 1;
                fetchDevices(state.devTenantFilter);
            });
        }
    }

    bindNetAndDevEvents();

    // ─── Simulation Console Helpers ─────────────────────────────────────
    function appendConsoleLog(line) {
        if (!consoleLogContainer) return;
        var placeholder = consoleLogContainer.querySelector(".console-placeholder");
        if (placeholder) {
            placeholder.remove();
        }

        // Parse and translate UTC/RFC3339 timestamp to local timezone timestamp
        var match = line.match(/^\[([^\]]+)\]/);
        if (match) {
            var rawTs = match[1];
            var date = new Date(rawTs);
            if (!isNaN(date.getTime())) {
                var localTs = [
                    date.getHours().toString().padStart(2, "0"),
                    date.getMinutes().toString().padStart(2, "0"),
                    date.getSeconds().toString().padStart(2, "0")
                ].join(":");
                line = line.replace(rawTs, localTs);
            }
        }

        var el = document.createElement("div");
        el.className = "console-log-line";

        var lowerLine = line.toLowerCase();
        if (lowerLine.includes(" level=error") || lowerLine.includes("error:") || lowerLine.includes(" level=fatal")) {
            el.style.color = "var(--red)";
        } else if (lowerLine.includes(" level=warn") || lowerLine.includes("warn:")) {
            el.style.color = "var(--yellow)";
        } else if (lowerLine.includes("send uplink") || lowerLine.includes("uplink frame sent") || lowerLine.includes("send otaa")) {
            el.style.color = "var(--accent)";
        }

        el.textContent = line;
        consoleLogContainer.appendChild(el);

        while (consoleLogContainer.children.length > 300) {
            consoleLogContainer.removeChild(consoleLogContainer.firstChild);
        }

        consoleLogContainer.scrollTop = consoleLogContainer.scrollHeight;
    }

    var logSource = null;
    function connectLogStream() {
        if (logSource) {
            logSource.close();
        }
        logSource = new EventSource("/api/logs/stream");

        logSource.onmessage = function (event) {
            appendConsoleLog(event.data);
        };

        logSource.onerror = function (err) {
            console.error("SSE connection error:", err);
            if (logSource) {
                logSource.close();
                logSource = null;
            }
            checkAuthStatus().then(function (auth) {
                if (auth) {
                    setTimeout(connectLogStream, 3000);
                }
            });
        };
    }

    function toggleConsole() {
        if (!bottomConsole || !btnConsoleToggle) return;
        if (bottomConsole.classList.contains("collapsed")) {
            bottomConsole.classList.remove("collapsed");
            bottomConsole.classList.add("expanded");
            btnConsoleToggle.textContent = "Daralt";
            var savedHeight = localStorage.getItem("console-height") || "320px";
            bottomConsole.style.height = savedHeight;
        } else {
            bottomConsole.classList.remove("expanded");
            bottomConsole.classList.add("collapsed");
            btnConsoleToggle.textContent = "Genislet";
            bottomConsole.style.height = "";
        }
    }

    function bindConsoleEvents() {
        if (btnConsoleToggle && bottomConsole) {
            btnConsoleToggle.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleConsole();
            });

            var header = document.querySelector(".console-header");
            if (header) {
                header.addEventListener("click", function (e) {
                    if (e.target.closest(".console-btn")) return;
                    toggleConsole();
                });
            }
        }

        if (consoleResizeHandle && bottomConsole) {
            consoleResizeHandle.addEventListener("mousedown", function (e) {
                e.preventDefault();
                e.stopPropagation();

                var startY = e.clientY;
                var startHeight = bottomConsole.getBoundingClientRect().height;

                bottomConsole.classList.add("resizing");

                function onMouseMove(moveEvent) {
                    var deltaY = startY - moveEvent.clientY;
                    var newHeight = startHeight + deltaY;

                    var maxHeight = window.innerHeight * 0.8;
                    if (newHeight < 42) {
                        newHeight = 42;
                    } else if (newHeight > maxHeight) {
                        newHeight = maxHeight;
                    }

                    bottomConsole.style.height = newHeight + "px";

                    if (newHeight > 60) {
                        if (bottomConsole.classList.contains("collapsed")) {
                            bottomConsole.classList.remove("collapsed");
                            bottomConsole.classList.add("expanded");
                            if (btnConsoleToggle) btnConsoleToggle.textContent = "Daralt";
                        }
                    } else {
                        if (bottomConsole.classList.contains("expanded")) {
                            bottomConsole.classList.remove("expanded");
                            bottomConsole.classList.add("collapsed");
                            if (btnConsoleToggle) btnConsoleToggle.textContent = "Genislet";
                        }
                    }
                }

                function onMouseUp() {
                    bottomConsole.classList.remove("resizing");
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);

                    if (bottomConsole.classList.contains("expanded")) {
                        var customHeight = bottomConsole.style.height;
                        localStorage.setItem("console-height", customHeight);
                    }
                }

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });
        }

        if (btnConsoleClear && consoleLogContainer) {
            btnConsoleClear.addEventListener("click", function (e) {
                e.stopPropagation();
                consoleLogContainer.innerHTML = "";
                if (state.currentStatus !== "running" && state.currentStatus !== "starting") {
                    var ph = document.createElement("div");
                    ph.className = "console-placeholder";
                    ph.textContent = "Simulasyon baslatildiginda canli loglar burada gorunecektir.";
                    consoleLogContainer.appendChild(ph);
                }
            });
        }

        // Top bar buttons
        if (btnTopStart) {
            btnTopStart.addEventListener("click", function (e) {
                e.preventDefault();
                startSimulation();
            });
        }
        if (btnTopStop) {
            btnTopStop.addEventListener("click", function (e) {
                e.preventDefault();
                stopSimulation();
            });
        }
    }

    function bindSettingsEvents() {
        var generalFieldIds = ["duration", "activation_time", "frequency", "bandwidth", "spreading_factor", "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload"];
        generalFieldIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                // Load saved setting on startup
                var localVal = localStorage.getItem("setting-" + id);
                if (localVal !== null) {
                    el.value = localVal;
                }
                // Save setting on change
                el.addEventListener("input", function () {
                    localStorage.setItem("setting-" + id, this.value.trim());
                });
            }
        });
    }

    // ─── Authentication Controls ───────────────────────────────────────
    async function checkAuthStatus() {
        var r = await api("GET", "/api/auth/status");
        return (r.ok && r.data && r.data.authenticated);
    }

    function showLoginScreen() {
        if (loginOverlay) {
            loginOverlay.style.display = "flex";
        }
        if (loginUsername) {
            loginUsername.value = "";
            loginPassword.value = "";
            if (loginError) loginError.style.display = "none";
            setTimeout(function() { loginUsername.focus(); }, 100);
        }
    }

    function hideLoginScreen() {
        if (loginOverlay) {
            loginOverlay.style.display = "none";
        }
    }

    function bindAuthEvents() {
        if (loginForm) {
            loginForm.addEventListener("submit", async function (e) {
                e.preventDefault();
                var username = loginUsername.value.trim();
                var password = loginPassword.value;

                if (btnLoginSubmit) {
                    btnLoginSubmit.disabled = true;
                    btnLoginSubmit.textContent = "Giriş yapılıyor...";
                }

                var r = await api("POST", "/api/auth/login", {
                    username: username,
                    password: password
                });

                if (btnLoginSubmit) {
                    btnLoginSubmit.disabled = false;
                    btnLoginSubmit.textContent = "Giriş Yap";
                }

                if (r.ok) {
                    hideLoginScreen();
                    logEntry("Kullanıcı girişi başarılı.", "success");
                    showToast("Giriş başarılı.", "success");
                    await loadDashboardData();
                } else {
                    var errMsg = (r.data && r.data.error) || "Giriş başarısız.";
                    if (loginError) {
                        loginError.textContent = errMsg;
                        loginError.style.display = "block";
                    }
                    loginPassword.value = "";
                    loginPassword.focus();
                }
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener("click", async function (e) {
                e.preventDefault();
                if (!confirm("Çıkış yapmak istediğinize emin misiniz?")) return;

                var r = await api("GET", "/api/auth/logout");
                if (r.ok) {
                    stopPolling();
                    if (logSource) {
                        logSource.close();
                        logSource = null;
                    }
                    if (consoleLogContainer) consoleLogContainer.innerHTML = "";
                    logEntry("Oturum kapatıldı.", "info");
                    showLoginScreen();
                } else {
                    showToast("Çıkış hatası", "error");
                }
            });
        }
    }

    async function loadDashboardData() {
        connectLogStream();

        // Health check
        var online = await checkHealth();
        if (online) {
            logEntry("API bağlantısı kuruldu.", "success");
        } else {
            logEntry("API'ye bağlanılamadı! Sunucu çalışıyor mu?", "error");
        }

        // Load organizations from ChirpStack API
        await fetchOrganizations();

        // Load device profiles
        populateDpFilterTenantSelect();
        await fetchDeviceProfiles("");

        // Load applications
        populateNetFilterTenantSelect();
        populateDevFilterTenantSelect();
        await fetchApplications(state.netTenantFilter);

        // Load devices
        await fetchDevices("");

        // Load current state
        await pollStatus();
        startPolling();
    }

    // ─── Init ──────────────────────────────────────────────────────────
    async function init() {
        bindSettingsEvents();
        bindAuthEvents();
        
        // Load saved theme
        var savedTheme = localStorage.getItem("theme");
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
            if (themeToggle) themeToggle.textContent = "☀";
        } else {
            document.body.classList.remove("light-theme");
            if (themeToggle) themeToggle.textContent = "🌙";
        }

        bindConsoleEvents();

        // Check authentication status
        var authenticated = await checkAuthStatus();
        if (authenticated) {
            hideLoginScreen();
            await loadDashboardData();
        } else {
            showLoginScreen();
        }
    }

    init();
})();
