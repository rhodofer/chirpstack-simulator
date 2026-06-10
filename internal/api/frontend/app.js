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
    var pageTitleBar      = $("#page-title-bar");

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
    var consoleLogFilter  = $("#console-log-filter");
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

    // Device Intervals DOM refs
    var devIntTableBody      = $("#dev-int-table-body");
    var devIntEmptyState     = $("#dev-int-empty-state");
    var devIntPageSizeSelect = $("#dev-int-page-size-select");
    var devIntTotalCountEl   = $("#dev-int-total-count");
    var devIntPaginationEl   = $("#dev-int-pagination");
    var devIntSearchInput    = $("#dev-int-search-input");
    var btnDevIntRefresh     = $("#btn-dev-int-refresh");
    var devEui              = $("#dev-eui");
    var btnRandomDevEui     = $("#btn-random-dev-eui");
    var devName             = $("#dev-name");
    var devApp              = $("#dev-app");
    var devProfile          = $("#dev-profile");
    var devDescription      = $("#dev-description");
    var devModalClose       = $("#dev-modal-close");
    var devModalCancel      = $("#dev-modal-cancel");
    var devModalSave        = $("#dev-modal-save");

    // Bootstrap Wizard DOM refs
    var btnTopBootstrap     = $("#btn-top-bootstrap");
    var bootModalOverlay    = $("#bootstrap-modal-overlay");
    var bootModalClose      = $("#bootstrap-modal-close");
    var wizBtnPrev          = $("#wiz-btn-prev");
    var wizBtnCancel        = $("#wiz-btn-cancel");
    var wizBtnNext          = $("#wiz-btn-next");
    var wizOrgName          = $("#wiz-org-name");
    var wizAppPrefix        = $("#wiz-app-prefix");
    var wizAppCount         = $("#wiz-app-count");
    var wizDpPrefix         = $("#wiz-dp-prefix");
    var wizDpCount          = $("#wiz-dp-count");
    var wizDevPrefix        = $("#wiz-dev-prefix");
    var wizDevCount         = $("#wiz-dev-count");

    // Login references
    var loginOverlay      = $("#login-overlay");
    var loginForm         = $("#login-form");
    var loginUsername     = $("#login-username");
    var loginPassword     = $("#login-password");
    var loginError        = $("#login-error");
    var btnLoginSubmit    = $("#btn-login-submit");
    var btnLogout         = $("#logout-btn");
    var appLanguageSelect = $("#app-language");

    // ─── State ─────────────────────────────────────────────────────────
    var state = {
        language: localStorage.getItem("sim_language") || "tr",
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
        appPageSize: 5,
        deviceIntervals: {},
        devIntPage: 1,
        devIntPageSize: 10,
        devIntSearchQuery: "",
        devIntSort: { key: "name", dir: "asc" },
        devIntFiltered: []
    };

    var pollTimer = null;

    // ─── Global Theme State & Helpers ──────────────────────────────────
    var presets = {
        "falt-cosmic": {
            bg: "#070913", fg: "#e2e8f0", cu: "#ff007f", ca: "#070913", sb: "#1e1b4b", sf: "#ffffff",
            0: "#141726", 1: "#ff5c00", 2: "#00ff87", 3: "#ffdf00", 4: "#0052ff",
            5: "#ff007f", 6: "#00f2fe", 7: "#f1f5f9", 8: "#1f243c", 9: "#ff7b30",
            10: "#33ff9e", 11: "#ffe533", 12: "#3375ff", 13: "#ff3399", 14: "#33f5ff",
            15: "#ffffff"
        },
        argonaut: {
            bg: "#0e1019", fg: "#fffaf4", cu: "#ff0018", ca: "#0e1019", sb: "#002a3b", sf: "#ffffff",
            0: "#232323", 1: "#ff000f", 2: "#8ce10a", 3: "#ffb900", 4: "#008df8",
            5: "#6c43a6", 6: "#00d8eb", 7: "#ffffff", 8: "#444444", 9: "#ff273f",
            10: "#abe15b", 11: "#ffd242", 12: "#0092ff", 13: "#9a5feb", 14: "#67fff0",
            15: "#ffffff"
        },
        afterglow: {
            bg: "#151515", fg: "#d6dbe5", cu: "#d6dbe5", ca: "#151515", sb: "#303030", sf: "#d6dbe5",
            0: "#1c1c1c", 1: "#a53d3d", 2: "#7b963b", 3: "#cca04c", 4: "#487bb0",
            5: "#9e5a8a", 6: "#44a69e", 7: "#d0d0d0", 8: "#505050", 9: "#b84c4c",
            10: "#8fa850", 11: "#e0b860", 12: "#5c90c4", 13: "#b26e9e", 14: "#58bab0",
            15: "#f5f5f5"
        },
        monokai: {
            bg: "#272822", fg: "#f8f8f2", cu: "#f8f8f0", ca: "#272822", sb: "#49483e", sf: "#f8f8f2",
            0: "#272822", 1: "#f92672", 2: "#a6e22e", 3: "#f4bf75", 4: "#66d9ef",
            5: "#ae81ff", 6: "#a1efe4", 7: "#f8f8f2", 8: "#75715e", 9: "#f92672",
            10: "#a6e22e", 11: "#f4bf75", 12: "#66d9ef", 13: "#ae81ff", 14: "#a1efe4",
            15: "#f9f8f5"
        },
        dracula: {
            bg: "#282a36", fg: "#f8f8f2", cu: "#f8f8f2", ca: "#282a36", sb: "#44475a", sf: "#f8f8f2",
            0: "#21222c", 1: "#ff5555", 2: "#50fa7b", 3: "#f1fa8c", 4: "#8be9fd",
            5: "#ff79c6", 6: "#bd93f9", 7: "#f8f8f2", 8: "#6272a4", 9: "#ff6e6e",
            10: "#69ff94", 11: "#ffffa5", 12: "#d6acff", 13: "#ff92df", 14: "#a4ffff",
            15: "#ffffff"
        },
        "solarized-dark": {
            bg: "#002b36", fg: "#839496", cu: "#839496", ca: "#002b36", sb: "#073642", sf: "#93a1a1",
            0: "#073642", 1: "#dc322f", 2: "#859900", 3: "#b58900", 4: "#268bd2",
            5: "#d33682", 6: "#2aa198", 7: "#eee8d5", 8: "#002b36", 9: "#cb4b16",
            10: "#586e75", 11: "#657b83", 12: "#839496", 13: "#6c71c4", 14: "#93a1a1",
            15: "#fdf6e3"
        },
        "solarized-light": {
            bg: "#fdf6e3", fg: "#586e75", cu: "#586e75", ca: "#fdf6e3", sb: "#eee8d5", sf: "#586e75",
            0: "#eee8d5", 1: "#dc322f", 2: "#859900", 3: "#b58900", 4: "#268bd2",
            5: "#d33682", 6: "#2aa198", 7: "#073642", 8: "#fdf6e3", 9: "#cb4b16",
            10: "#93a1a1", 11: "#839496", 12: "#657b83", 13: "#6c71c4", 14: "#586e75",
            15: "#073642"
        },
        default: {
            bg: "#080a0f", fg: "#e2e8f0", cu: "#e2e8f0", ca: "#080a0f", sb: "#2563eb", sf: "#ffffff",
            0: "#1e293b", 1: "#ef4444", 2: "#22c55e", 3: "#eab308", 4: "#3b82f6",
            5: "#a855f7", 6: "#06b6d4", 7: "#e2e8f0", 8: "#475569", 9: "#f87171",
            10: "#4ade80", 11: "#facc15", 12: "#60a5fa", 13: "#c084fc", 14: "#22d3ee",
            15: "#ffffff"
        }
    };

    var keys = ["fg", "bg", "cu", "ca", "sb", "sf", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
    var currentPreset = "falt-cosmic";
    var activeTheme = Object.assign({}, presets["falt-cosmic"]);

    function normalizeHex(hex) {
        if (!hex) return "#000000";
        hex = hex.trim();
        if (hex.startsWith("#")) hex = hex.slice(1);
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        return "#" + hex;
    }

    function hexToRgb(hex) {
        hex = normalizeHex(hex);
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return r + "," + g + "," + b;
    }

    function adjustColorBrightness(hex, percent) {
        hex = normalizeHex(hex);
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);

        var amt = Math.round(2.55 * percent);
        r = Math.max(0, Math.min(255, r + amt));
        g = Math.max(0, Math.min(255, g + amt));
        b = Math.max(0, Math.min(255, b + amt));

        var rHex = r.toString(16).padStart(2, '0');
        var gHex = g.toString(16).padStart(2, '0');
        var bHex = b.toString(16).padStart(2, '0');

        return "#" + rHex + gHex + bHex;
    }

    function isLightColor(hex) {
        hex = normalizeHex(hex);
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma > 128;
    }

    function applyGlobalTheme(themeObj) {
        var root = document.documentElement;
        if (!root) return;

        var bg = normalizeHex(themeObj.bg);
        var fg = normalizeHex(themeObj.fg);
        var cu = normalizeHex(themeObj.cu);
        var sb = normalizeHex(themeObj.sb);

        var isLight = isLightColor(bg);

        var bgDeepest, bgCard, bgField, bgSidebar, bgSecSidebar;
        var text, textDim;
        var border, borderSoft;

        if (isLight) {
            bgDeepest = adjustColorBrightness(bg, -5);
            bgCard = "#ffffff";
            bgField = adjustColorBrightness(bg, -3);
            bgSidebar = sb;
            bgSecSidebar = adjustColorBrightness(sb, -5);

            text = fg;
            textDim = adjustColorBrightness(fg, 30);

            border = adjustColorBrightness(bg, -15);
            borderSoft = adjustColorBrightness(bg, -8);
        } else {
            bgDeepest = adjustColorBrightness(bg, -12);
            bgCard = adjustColorBrightness(bg, 8);
            bgField = adjustColorBrightness(bg, 14);
            bgSidebar = sb;
            bgSecSidebar = adjustColorBrightness(sb, -8);

            text = fg;
            textDim = adjustColorBrightness(fg, -30);

            border = adjustColorBrightness(bg, 18);
            borderSoft = adjustColorBrightness(bg, 10);
        }

        var accent = cu;
        var accentHover = adjustColorBrightness(cu, isLight ? -10 : 10);
        var accentSoft = "rgba(" + hexToRgb(cu) + ", 0.12)";

        var green = normalizeHex(themeObj[2] || themeObj[10] || "#22c55e");
        var red = normalizeHex(themeObj[1] || themeObj[9] || "#ef4444");
        var yellow = normalizeHex(themeObj[3] || themeObj[11] || "#eab308");
        var blue = normalizeHex(themeObj[4] || themeObj[12] || "#3b82f6");

        root.style.setProperty("--bg", bg);
        root.style.setProperty("--bg-deepest", bgDeepest);
        root.style.setProperty("--bg-card", bgCard);
        root.style.setProperty("--bg-field", bgField);
        root.style.setProperty("--bg-sidebar", bgSidebar);
        root.style.setProperty("--bg-secondary-sidebar", bgSecSidebar);

        root.style.setProperty("--text", text);
        root.style.setProperty("--text-dim", textDim);

        root.style.setProperty("--border", border);
        root.style.setProperty("--border-soft", borderSoft);

        root.style.setProperty("--accent", accent);
        root.style.setProperty("--accent-hover", accentHover);
        root.style.setProperty("--accent-soft", accentSoft);

        root.style.setProperty("--green", green);
        root.style.setProperty("--red", red);
        root.style.setProperty("--yellow", yellow);
        root.style.setProperty("--blue", blue);

        // Inject all 16 ANSI colors (0 to 15) to :root
        for (var i = 0; i <= 15; i++) {
            var val = themeObj[i] || presets["falt-cosmic"][i];
            root.style.setProperty("--ansi-" + i, normalizeHex(val));
        }
    }

    function applyTheme(themeObj) {
        var targets = [$("#console-log-container"), $("#console-preview")];
        targets.forEach(function (el) {
            if (!el) return;
            el.style.setProperty("--c-fg", themeObj.fg);
            el.style.setProperty("--c-bg", themeObj.bg);
            el.style.setProperty("--c-cu", themeObj.cu);
            el.style.setProperty("--c-ca", themeObj.ca);
            el.style.setProperty("--c-sb", themeObj.sb);
            el.style.setProperty("--c-sf", themeObj.sf);
            keys.forEach(function (key) {
                if (key !== "fg" && key !== "bg" && key !== "cu" && key !== "ca" && key !== "sb" && key !== "sf") {
                    el.style.setProperty("--c-ansi-" + key, themeObj[key]);
                }
            });
        });
        applyGlobalTheme(themeObj);
    }

    function updateInputs(themeObj) {
        keys.forEach(function (key) {
            var input = $("#c-color-" + key);
            if (input) {
                input.value = themeObj[key];
            }
        });
        var presetSelect = $("#console-theme-preset");
        if (presetSelect) presetSelect.value = currentPreset;
    }

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
            uplink_interval: "2m",
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
            logEntry("Simulation finished.", "success");
        }
        if (data.status === "error") {
            logEntry("Simulation error occurred!", "error");
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
            logEntry("Settings saved successfully to server database (SQLite).", "success");
            showToast("Ayarlar başarıyla kaydedildi.", "success");
            closeDrawer();
        } else {
            var errMsg = (r.data && r.data.error) || "Kaydetme hatası";
            logEntry("Failed to save settings: " + errMsg, "error");
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
            logEntry("Failed to load organizations: " + errMsg, "error");
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
            logEntry("New organization created: " + org.name + " (ID: " + org.id + ")", "success");
            showToast("'" + org.name + "' organizasyonu oluşturuldu.", "success");
            await fetchOrganizations();
            openDrawer(org.id);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to create organization: " + errMsg, "error");
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
            logEntry("Organization deleted: " + org.name, "success");
            showToast("'" + org.name + "' silindi.", "success");
            if (state.activeOrgId === id) {
                closeDrawer();
                state.activeOrgId = null;
            }
            await fetchOrganizations();
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Failed to delete organization: " + errMsg, "error");
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
            logEntry("Failed to load device profiles: " + errMsg, "error");
        }
        applyDpFiltersAndRender();
    }

    async function createDeviceProfile(data) {
        var r = await api("POST", "/api/device-profiles", data);
        if (r.ok) {
            var dp = r.data;
            logEntry("New device profile created: " + dp.name + " (ID: " + dp.id + ")", "success");
            showToast("'" + dp.name + "' profili oluşturuldu.", "success");
            await fetchDeviceProfiles(state.dpTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to create device profile: " + errMsg, "error");
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
            var va = a[sk];
            var vb = b[sk];
            if (sk === "tenant_id") {
                va = getOrgName(va);
                vb = getOrgName(vb);
            }
            var vaStr = (va || "").toString().toLowerCase();
            var vbStr = (vb || "").toString().toLowerCase();
            if (vaStr < vbStr) return -1 * sd;
            if (vaStr > vbStr) return 1 * sd;
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
                '<td><span class="org-name-primary">' + escapeHtml(getOrgName(dp.tenant_id)) + '</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">' + escapeHtml(dp.tenant_id || "—") + '</span></td>' +
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
        prevBtn.innerHTML = t("prev_page");
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
        nextBtn.innerHTML = t("next_page");
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToDpPage(current + 1); });
        dpPaginationEl.appendChild(nextBtn);
    }

    function renderDpTotalCount() {
        dpTotalCountEl.innerHTML = t("footer_total_dp").replace("{count}", state.dpFiltered.length);
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
            logEntry("Device profile deleted: " + dp.name, "success");
            showToast("'" + dp.name + "' silindi.", "success");
            await fetchDeviceProfiles(state.dpTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Failed to delete device profile: " + errMsg, "error");
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

            var appCount = state.applications.filter(function (app) { return app.tenant_id === org.id; }).length;
            var dpCount = state.dpList.filter(function (dp) { return dp.tenant_id === org.id; }).length;
            var devCount = state.devList.filter(function (dev) { return dev.tenant_id === org.id; }).length;

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
                '<td><span class="badge" style="background: rgba(0, 82, 255, 0.08); color: var(--blue); border: 1px solid rgba(0, 82, 255, 0.2);">' + appCount + ' Ağ</span></td>' +
                '<td><span class="badge" style="background: rgba(240, 160, 64, 0.08); color: var(--accent); border: 1px solid rgba(240, 160, 64, 0.2);">' + dpCount + ' Profil</span></td>' +
                '<td><span class="badge" style="background: rgba(0, 255, 135, 0.08); color: var(--green); border: 1px solid rgba(0, 255, 135, 0.2);">' + devCount + ' Cihaz</span></td>' +
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
        prevBtn.innerHTML = t("prev_page");
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
        nextBtn.innerHTML = t("next_page");
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToPage(current + 1); });
        paginationEl.appendChild(nextBtn);
    }

    function renderTotalCount() {
        var total = state.filteredOrgs.length;
        totalCountEl.innerHTML = t("footer_total_org").replace("{count}", total);
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

        logEntry("Organization selected: " + org.name, "info");
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

        // Aktif tab'a göre verileri çek
        if (name === "overview") {
            fetchOrganizations();
        } else if (name === "devices") {
            fetchDeviceProfiles(state.dpTenantFilter);
        } else if (name === "networks") {
            fetchApplications(state.netTenantFilter);
        } else if (name === "device-list") {
            fetchDevices(state.devTenantFilter);
        } else if (name === "device-intervals") {
            fetchDevices("");
            fetchDeviceIntervals();
        }
    }

    function updatePageTitle() {
        var titles = {
            overview: t("nav_organizations"),
            devices: t("nav_device_profiles"),
            networks: t("nav_networks"),
            "device-list": t("nav_devices"),
            settings: t("nav_settings"),
            console: t("console_title"),
            info: t("info_title")
        };
        if (pageTitleBar) {
            pageTitleBar.textContent = titles[state.currentTab] || "Overview";
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
        var isLight = isLightColor(activeTheme.bg);
        if (isLight) {
            var savedPreset = localStorage.getItem("console-custom-preset") || "falt-cosmic";
            if (savedPreset === "custom" || isLightColor(presets[savedPreset] ? presets[savedPreset].bg : "#000000")) {
                savedPreset = "falt-cosmic";
            }
            currentPreset = savedPreset;
            activeTheme = Object.assign({}, presets[savedPreset]);
        } else {
            currentPreset = "solarized-light";
            activeTheme = Object.assign({}, presets["solarized-light"]);
        }
        applyTheme(activeTheme);
        updateInputs(activeTheme);

        localStorage.setItem("console-custom-theme", JSON.stringify(activeTheme));
        localStorage.setItem("console-custom-preset", currentPreset);

        var currentIsLight = isLightColor(activeTheme.bg);
        themeToggle.textContent = currentIsLight ? "☀" : "🌙";
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

    function getOrgName(tenantId) {
        if (!tenantId) return "—";
        var org = findOrg(tenantId);
        return org ? org.name : tenantId;
    }

    function getDpName(dpId) {
        if (!dpId) return "—";
        var dp = findDp(dpId);
        return dp ? dp.name : dpId;
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
        logEntry("Simulation is starting...", "info");

        var r = await api("POST", "/api/start", cfg);

        if (r.ok) {
            logEntry("Start request sent.", "success");
            showToast("Simülasyon başlatılıyor...", "success");
            connectLogStream();
            startPolling();
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to start: " + errMsg, "error");
            showToast(errMsg, "error");
            if (btnStart) btnStart.disabled = false;
        }
    }

    // ─── Stop Simulation ───────────────────────────────────────────────
    async function stopSimulation() {
        if (btnStop) btnStop.disabled = true;
        logEntry("Simulation is stopping...", "info");

        var r = await api("POST", "/api/stop");

        if (r.ok) {
            logEntry("Stop request sent.", "success");
            showToast("Simülasyon durduruluyor...", "success");
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to stop: " + errMsg, "error");
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
            logEntry("New application created: " + app.name + " (ID: " + app.id + ")", "success");
            showToast("'" + app.name + "' uygulaması oluşturuldu.", "success");
            await fetchApplications(state.netTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to create application: " + errMsg, "error");
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
            logEntry("Application deleted: " + app.name, "success");
            showToast("'" + app.name + "' silindi.", "success");
            await fetchApplications(state.netTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Failed to delete application: " + errMsg, "error");
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
                `<td><span class="org-name-primary">${escapeHtml(getOrgName(app.tenant_id))}</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">${escapeHtml(app.tenant_id || "—")}</span></td>` +
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
        prevBtn.innerHTML = t("prev_page");
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
        nextBtn.innerHTML = t("next_page");
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToAppPage(current + 1); });
        netPaginationEl.appendChild(nextBtn);
    }

    function renderAppTotalCount() {
        netTotalCountEl.innerHTML = t("footer_total_net").replace("{count}", state.appFiltered.length);
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
            logEntry("Failed to load devices: " + errMsg, "error");
        }
        applyDevFiltersAndRender();
    }

    async function createDevice(data) {
        var r = await api("POST", "/api/devices", data);
        if (r.ok) {
            var dev = r.data;
            logEntry("New device created: " + dev.name + " (EUI: " + dev.dev_eui + ")", "success");
            showToast("'" + dev.name + "' cihazı oluşturuldu.", "success");
            await fetchDevices(state.devTenantFilter);
            return true;
        } else {
            var errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to create device: " + errMsg, "error");
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
            logEntry("Device deleted: " + dev.name, "success");
            showToast("'" + dev.name + "' silindi.", "success");
            await fetchDevices(state.devTenantFilter);
        } else {
            var errMsg = (r.data && r.data.error) || "Silme hatası";
            logEntry("Failed to delete device: " + errMsg, "error");
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
            var va = a[sk];
            var vb = b[sk];
            if (sk === "tenant_id") {
                va = getOrgName(va);
                vb = getOrgName(vb);
            }
            if (sk === "device_profile_id") {
                va = getDpName(va);
                vb = getDpName(vb);
            }
            var vaStr = (va || "").toString().toLowerCase();
            var vbStr = (vb || "").toString().toLowerCase();
            if (vaStr < vbStr) return -1 * sd;
            if (vaStr > vbStr) return 1 * sd;
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
                '<td><span class="org-name-primary">' + escapeHtml(getOrgName(dev.tenant_id)) + '</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">' + escapeHtml(dev.tenant_id || "—") + '</span></td>' +
                '<td><span class="id-cell">' + escapeHtml(dev.dev_eui) + '</span></td>' +
                '<td><span class="org-name-primary">' + escapeHtml(getDpName(dev.device_profile_id)) + '</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">' + escapeHtml(dev.device_profile_id || "—") + '</span></td>' +
                '<td>' +
                    '<select class="page-size-select dev-table-interval-select" data-id="' + dev.dev_eui + '" style="font-size: 11px; padding: 2px 6px; background: rgba(0, 255, 135, 0.05); color: var(--green); border: 1px solid rgba(0, 255, 135, 0.2); border-radius: var(--radius-xs); cursor: pointer; max-width: 100px;">' +
                        '<option value="1m"' + ((state.deviceIntervals[dev.dev_eui] || "2m") === "1m" ? " selected" : "") + '>' + (state.language === "tr" ? "1 dk" : "1 min") + '</option>' +
                        '<option value="2m"' + ((state.deviceIntervals[dev.dev_eui] || "2m") === "2m" ? " selected" : "") + '>' + (state.language === "tr" ? "2 dk" : "2 min") + '</option>' +
                        '<option value="4m"' + ((state.deviceIntervals[dev.dev_eui] || "2m") === "4m" ? " selected" : "") + '>' + (state.language === "tr" ? "4 dk" : "4 min") + '</option>' +
                        '<option value="5m"' + ((state.deviceIntervals[dev.dev_eui] || "2m") === "5m" ? " selected" : "") + '>' + (state.language === "tr" ? "5 dk" : "5 min") + '</option>' +
                        '<option value="10m"' + ((state.deviceIntervals[dev.dev_eui] || "2m") === "10m" ? " selected" : "") + '>' + (state.language === "tr" ? "10 dk" : "10 min") + '</option>' +
                    '</select>' +
                '</td>' +
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

            var intervalSelect = tr.querySelector(".dev-table-interval-select");
            if (intervalSelect) {
                intervalSelect.addEventListener("change", function (e) {
                    var devEui = this.getAttribute("data-id");
                    var val = this.value;
                    updateDeviceInterval(devEui, val);
                });
            }

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
        prevBtn.innerHTML = t("prev_page");
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
        nextBtn.innerHTML = t("next_page");
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToDevPage(current + 1); });
        devPaginationEl.appendChild(nextBtn);
    }

    function renderDevTotalCount() {
        devTotalCountEl.innerHTML = t("footer_total_dev").replace("{count}", state.devFiltered.length);
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

    // ─── Device Intervals API & Table ──────────────────────────────────
    async function fetchDeviceIntervals() {
        var r = await api("GET", "/api/device-intervals");
        if (r.ok && r.data.intervals) {
            state.deviceIntervals = r.data.intervals;
        } else {
            state.deviceIntervals = {};
        }
        applyDevIntFiltersAndRender();
    }

    function lockUI(msg) {
        var overlay = document.getElementById("loading-lock-overlay");
        var message = document.getElementById("loading-lock-message");
        if (overlay) overlay.style.display = "flex";
        if (message) message.textContent = msg;
    }

    function unlockUI() {
        var overlay = document.getElementById("loading-lock-overlay");
        if (overlay) overlay.style.display = "none";
    }

    async function updateDeviceInterval(devEui, interval) {
        lockUI("Gönderim sıklığı kaydediliyor...");
        var r = await api("POST", "/api/device-intervals", { dev_eui: devEui, interval: interval });
        if (!r.ok) {
            showToast("Güncelleme başarısız: " + ((r.data && r.data.error) || "Hata"), "error");
            unlockUI();
            fetchDeviceIntervals();
            return;
        }
        state.deviceIntervals[devEui] = interval;

        lockUI("Simülatör durumu kontrol ediliyor...");
        var statusRes = await api("GET", "/api/status");
        if (!statusRes.ok) {
            showToast("Simülatör durumu alınamadı.", "error");
            unlockUI();
            applyDevFiltersAndRender();
            return;
        }

        var simStatus = statusRes.data.status;
        var simConfig = statusRes.data.config;

        if (simStatus === "running" || simStatus === "starting") {
            lockUI("Simülatör durduruluyor...");
            var stopRes = await api("POST", "/api/stop");
            if (!stopRes.ok) {
                showToast("Simülatör durdurulamadı: " + ((stopRes.data && stopRes.data.error) || ""), "error");
                unlockUI();
                applyDevFiltersAndRender();
                return;
            }

            // Poll status until idle
            var isStopped = false;
            for (var attempt = 0; attempt < 30; attempt++) {
                await new Promise(function(resolve) { setTimeout(resolve, 500); });
                var pollRes = await api("GET", "/api/status");
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

            await new Promise(function(resolve) { setTimeout(resolve, 1000); });

            lockUI("Simülatör yeniden başlatılıyor...");
            if (simConfig) {
                var startRes = await api("POST", "/api/start", simConfig);
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

    function getDeviceIntervalText(devEui) {
        var val = state.deviceIntervals[devEui] || "2m";
        var mapping = {
            "1m": "1 dk",
            "2m": "2 dk",
            "4m": "4 dk",
            "5m": "5 dk",
            "10m": "10 dk"
        };
        return mapping[val] || val;
    }

    function applyDevIntFiltersAndRender() {
        var q = state.devIntSearchQuery.toLowerCase();
        if (q) {
            state.devIntFiltered = state.devList.filter(function (dev) {
                return (dev.name && dev.name.toLowerCase().indexOf(q) !== -1) ||
                       (dev.dev_eui && dev.dev_eui.toLowerCase().indexOf(q) !== -1);
            });
        } else {
            state.devIntFiltered = state.devList.slice();
        }
        var sk = state.devIntSort.key;
        var sd = state.devIntSort.dir === "asc" ? 1 : -1;
        state.devIntFiltered.sort(function (a, b) {
            var va = a[sk];
            var vb = b[sk];
            if (sk === "tenant_id") {
                va = getOrgName(va);
                vb = getOrgName(vb);
            }
            var vaStr = (va || "").toString().toLowerCase();
            var vbStr = (vb || "").toString().toLowerCase();
            if (vaStr < vbStr) return -1 * sd;
            if (vaStr > vbStr) return 1 * sd;
            return 0;
        });
        var totalPages = Math.max(1, Math.ceil(state.devIntFiltered.length / state.devIntPageSize));
        if (state.devIntPage > totalPages) state.devIntPage = totalPages;
        renderDevIntTable();
        renderDevIntPagination();
        renderDevIntTotalCount();
    }

    function renderDevIntTable() {
        devIntTableBody.innerHTML = "";
        if (state.devIntFiltered.length === 0) {
            devIntEmptyState.style.display = "block";
            return;
        }
        devIntEmptyState.style.display = "none";
        var start = (state.devIntPage - 1) * state.devIntPageSize;
        var end = Math.min(start + state.devIntPageSize, state.devIntFiltered.length);
        var pageItems = state.devIntFiltered.slice(start, end);
        for (var i = 0; i < pageItems.length; i++) {
            var dev = pageItems[i];
            var currentInterval = state.deviceIntervals[dev.dev_eui] || "2m";
            var tr = document.createElement("tr");
            tr.setAttribute("data-id", dev.dev_eui);
            
            var optionsHtml = "";
            var intervalsList = [
                { val: "1m", label: "1 dk" },
                { val: "2m", label: "2 dk" },
                { val: "4m", label: "4 dk" },
                { val: "5m", label: "5 dk" },
                { val: "10m", label: "10 dk" }
            ];
            for (var k = 0; k < intervalsList.length; k++) {
                var isSelected = (intervalsList[k].val === currentInterval) ? "selected" : "";
                optionsHtml += '<option value="' + intervalsList[k].val + '" ' + isSelected + '>' + intervalsList[k].label + '</option>';
            }

            tr.innerHTML =
                '<td><span class="org-name-primary">' + escapeHtml(dev.name) + '</span></td>' +
                '<td><span class="org-name-primary">' + escapeHtml(getOrgName(dev.tenant_id)) + '</span><br><span class="id-cell" style="font-size:11px; opacity:0.6;">' + escapeHtml(dev.tenant_id || "—") + '</span></td>' +
                '<td><span class="id-cell">' + escapeHtml(dev.dev_eui) + '</span></td>' +
                '<td>' +
                    '<select class="page-size-select dev-interval-select" style="max-width: 160px;" data-id="' + dev.dev_eui + '">' +
                        optionsHtml +
                    '</select>' +
                '</td>';
            
            var selectEl = tr.querySelector(".dev-interval-select");
            selectEl.addEventListener("change", function () {
                var devEuiVal = this.getAttribute("data-id");
                var intervalVal = this.value;
                updateDeviceInterval(devEuiVal, intervalVal);
            });

            devIntTableBody.appendChild(tr);
        }
    }

    function renderDevIntPagination() {
        devIntPaginationEl.innerHTML = "";
        var total = state.devIntFiltered.length;
        var totalPages = Math.max(1, Math.ceil(total / state.devIntPageSize));
        var current = state.devIntPage;
        var prevBtn = document.createElement("button");
        prevBtn.className = "pagination-btn";
        prevBtn.innerHTML = t("prev_page");
        prevBtn.disabled = (current <= 1);
        prevBtn.addEventListener("click", function () { goToDevIntPage(current - 1); });
        devIntPaginationEl.appendChild(prevBtn);
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (var p = startPage; p <= endPage; p++) {
            var pageBtn = document.createElement("button");
            pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
            pageBtn.textContent = p;
            pageBtn.addEventListener("click", (function (pageNum) {
                return function () { goToDevIntPage(pageNum); };
            })(p));
            devIntPaginationEl.appendChild(pageBtn);
        }
        var nextBtn = document.createElement("button");
        nextBtn.className = "pagination-btn";
        nextBtn.innerHTML = t("next_page");
        nextBtn.disabled = (current >= totalPages);
        nextBtn.addEventListener("click", function () { goToDevIntPage(current + 1); });
        devIntPaginationEl.appendChild(nextBtn);
    }

    function renderDevIntTotalCount() {
        devIntTotalCountEl.innerHTML = t("footer_total_dev").replace("{count}", state.devIntFiltered.length);
    }

    function goToDevIntPage(n) {
        var totalPages = Math.max(1, Math.ceil(state.devIntFiltered.length / state.devIntPageSize));
        if (n < 1 || n > totalPages) return;
        state.devIntPage = n;
        applyDevIntFiltersAndRender();
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

    // ─── Setup Wizard Modal Controls ───────────────────────────────────
    var wizardCurrentStep = 1;

    function showBootstrapWizard() {
        wizardCurrentStep = 1;
        wizOrgName.value = "";
        wizAppPrefix.value = "ag";
        wizAppCount.value = "5";
        wizDpPrefix.value = "profile";
        wizDpCount.value = "5";
        wizDevPrefix.value = "device";
        wizDevCount.value = "5";
        
        wizBtnNext.disabled = false;
        wizBtnNext.textContent = t("btn_next");
        renderBootstrapStep();
        bootModalOverlay.style.display = "flex";
        setTimeout(function () { wizOrgName.focus(); }, 100);
    }

    function hideBootstrapWizard() {
        bootModalOverlay.style.display = "none";
    }

    function renderBootstrapStep() {
        for (var i = 1; i <= 6; i++) {
            var pane = $("#wiz-pane-" + i);
            if (pane) pane.style.display = "none";
            
            var stepIndicator = $("#wiz-step-" + i);
            if (stepIndicator) {
                stepIndicator.classList.remove("active");
                stepIndicator.style.color = "var(--text-muted)";
            }
        }

        var currentPane = $("#wiz-pane-" + wizardCurrentStep);
        if (currentPane) currentPane.style.display = "block";
        
        var currentIndicator = $("#wiz-step-" + wizardCurrentStep);
        if (currentIndicator) {
            currentIndicator.classList.add("active");
            currentIndicator.style.color = "var(--accent)";
        }

        setTimeout(function () {
            if (wizardCurrentStep === 1) wizOrgName.focus();
            else if (wizardCurrentStep === 2) wizAppPrefix.focus();
            else if (wizardCurrentStep === 3) wizDpPrefix.focus();
            else if (wizardCurrentStep === 4) wizDevPrefix.focus();
        }, 100);

        if (wizardCurrentStep === 1 || wizardCurrentStep === 6) {
            wizBtnPrev.style.display = "none";
        } else {
            wizBtnPrev.style.display = "inline-block";
        }

        if (wizardCurrentStep === 5) {
            // Populate Step 5 Summary
            var sumOrg = $("#wiz-summary-org");
            var sumApps = $("#wiz-summary-apps");
            var sumProfiles = $("#wiz-summary-profiles");

            if (sumOrg) sumOrg.textContent = wizOrgName.value.trim();
            if (sumApps) sumApps.textContent = wizAppCount.value;
            if (sumProfiles) sumProfiles.textContent = wizDpCount.value;

            var slotsBody = $("#wiz-summary-slots-body");
            if (slotsBody) {
                slotsBody.innerHTML = "";
                var devCount = parseInt(wizDevCount.value, 10) || 0;
                var dpCount = parseInt(wizDpCount.value, 10) || 0;
                var devPref = wizDevPrefix.value.trim() || "device";
                var dpPref = wizDpPrefix.value.trim() || "profile";
                var orgNameVal = wizOrgName.value.trim();

                for (var sIdx = 1; sIdx <= devCount; sIdx++) {
                    var tr = document.createElement("tr");
                    
                    // Profile dropdown options
                    var dpOptionsHtml = "";
                    for (var pIdx = 1; pIdx <= dpCount; pIdx++) {
                        var profileDisplayName = orgNameVal + "-" + dpPref + "-" + pIdx;
                        var isSelected = ((sIdx - 1) % dpCount === (pIdx - 1)) ? "selected" : "";
                        dpOptionsHtml += '<option value="' + pIdx + '" ' + isSelected + '>' + escapeHtml(profileDisplayName) + '</option>';
                    }

                    // Interval dropdown options
                    var intervalsList = [
                        { val: "1m", label: "1 dk" },
                        { val: "2m", label: "2 dk" },
                        { val: "4m", label: "4 dk" },
                        { val: "5m", label: "5 dk" },
                        { val: "10m", label: "10 dk" }
                    ];
                    var intOptionsHtml = "";
                    for (var k = 0; k < intervalsList.length; k++) {
                        var isIntSelected = (intervalsList[k].val === "2m") ? "selected" : "";
                        intOptionsHtml += '<option value="' + intervalsList[k].val + '" ' + isIntSelected + '>' + intervalsList[k].label + '</option>';
                    }

                    tr.innerHTML = 
                        '<td style="padding: 6px 8px;"><strong>' + escapeHtml(devPref) + '-' + sIdx + '</strong></td>' +
                        '<td style="padding: 6px 8px;">' +
                            '<select class="page-size-select wiz-slot-dp-select" style="max-width: 100%; font-size:11px;" data-slot="' + sIdx + '">' +
                                dpOptionsHtml +
                            '</select>' +
                        '</td>' +
                        '<td style="padding: 6px 8px;">' +
                            '<select class="page-size-select wiz-slot-int-select" style="max-width: 100%; font-size:11px;" data-slot="' + sIdx + '">' +
                                intOptionsHtml +
                            '</select>' +
                        '</td>';

                    slotsBody.appendChild(tr);
                }
            }

            wizBtnCancel.style.display = "inline-block";
            wizBtnNext.textContent = t("wiz_btn_confirm");
        } else if (wizardCurrentStep === 6) {
            wizBtnCancel.style.display = "none";
            wizBtnNext.textContent = t("wiz_btn_close");
            wizBtnNext.disabled = false;
        } else {
            wizBtnCancel.style.display = "inline-block";
            wizBtnNext.textContent = t("btn_next");
        }
    }

    function prevBootstrapStep() {
        if (wizardCurrentStep > 1) {
            wizardCurrentStep--;
            renderBootstrapStep();
        }
    }

    async function nextBootstrapStep() {
        if (wizardCurrentStep === 6) {
            hideBootstrapWizard();
            return;
        }
        if (wizardCurrentStep === 1) {
            var org = wizOrgName.value.trim();
            if (!org) {
                showToast("Organizasyon adı zorunludur!", "error");
                wizOrgName.focus();
                return;
            }
        } else if (wizardCurrentStep === 2) {
            var appPref = wizAppPrefix.value.trim();
            var appCnt = parseInt(wizAppCount.value, 10);
            if (!appPref) {
                showToast("Uygulama prefix'i zorunludur!", "error");
                wizAppPrefix.focus();
                return;
            }
            if (isNaN(appCnt) || appCnt < 1 || appCnt > 50) {
                showToast("Geçerli bir ağ sayısı girin (1-50)!", "error");
                wizAppCount.focus();
                return;
            }
        } else if (wizardCurrentStep === 3) {
            var dpPref = wizDpPrefix.value.trim();
            var dpCnt = parseInt(wizDpCount.value, 10);
            if (!dpPref) {
                showToast("Profil prefix'i zorunludur!", "error");
                wizDpPrefix.focus();
                return;
            }
            if (isNaN(dpCnt) || dpCnt < 1 || dpCnt > 50) {
                showToast("Geçerli bir profil sayısı girin (1-50)!", "error");
                wizDpCount.focus();
                return;
            }
        } else if (wizardCurrentStep === 4) {
            var devPref = wizDevPrefix.value.trim();
            var devCnt = parseInt(wizDevCount.value, 10);
            if (!devPref) {
                showToast("Cihaz prefix'i zorunludur!", "error");
                wizDevPrefix.focus();
                return;
            }
            if (isNaN(devCnt) || devCnt < 1 || devCnt > 100) {
                showToast("Geçerli bir cihaz sayısı girin (1-100)!", "error");
                wizDevCount.focus();
                return;
            }
        } else if (wizardCurrentStep === 5) {
            await submitBootstrap();
            return;
        }

        wizardCurrentStep++;
        renderBootstrapStep();
    }

    async function submitBootstrap() {
        var payload = {
            org_name: wizOrgName.value.trim(),
            app_prefix: wizAppPrefix.value.trim(),
            app_count: parseInt(wizAppCount.value, 10),
            dp_prefix: wizDpPrefix.value.trim(),
            dp_count: parseInt(wizDpCount.value, 10),
            dev_prefix: wizDevPrefix.value.trim(),
            dev_count: parseInt(wizDevCount.value, 10)
        };

        var devicesConfig = [];
        var dpSelects = $$(".wiz-slot-dp-select");
        var intSelects = $$(".wiz-slot-int-select");

        for (var i = 0; i < dpSelects.length; i++) {
            var slotIdx = parseInt(dpSelects[i].getAttribute("data-slot"), 10);
            var profIdx = parseInt(dpSelects[i].value, 10);
            var intervalVal = intSelects[i].value;

            devicesConfig.push({
                device_index: slotIdx,
                profile_index: profIdx,
                interval: intervalVal
            });
        }
        payload.devices_config = devicesConfig;

        wizBtnNext.disabled = true;
        wizBtnNext.textContent = t("wiz_btn_creating");

        try {
            var res = await fetch("/api/bootstrap", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            var data = await res.json();
            if (res.ok) {
                // Populate success pane
                var orgEl = $("#wiz-success-org");
                var orgIdEl = $("#wiz-success-org-id");
                var devCountEl = $("#wiz-success-dev-count");
                
                if (orgEl) orgEl.textContent = data.tenant_name || "";
                if (orgIdEl) orgIdEl.textContent = data.tenant_id ? "ID: " + data.tenant_id : "";
                if (devCountEl) devCountEl.textContent = data.devices_count || "0";

                var appsList = $("#wiz-success-apps-list");
                if (appsList) {
                    appsList.innerHTML = "";
                    if (data.applications) {
                        data.applications.forEach(function (app) {
                            var li = document.createElement("li");
                            li.innerHTML = escapeHtml(app.name) + ' <span style="font-size:11px; opacity:0.6;">(ID: ' + escapeHtml(app.id) + ')</span>';
                            appsList.appendChild(li);
                        });
                    }
                }

                var profilesList = $("#wiz-success-profiles-list");
                if (profilesList) {
                    profilesList.innerHTML = "";
                    if (data.profiles) {
                        data.profiles.forEach(function (prof) {
                            var li = document.createElement("li");
                            li.innerHTML = escapeHtml(prof.name) + ' <span style="font-size:11px; opacity:0.6;">(ID: ' + escapeHtml(prof.id) + ')</span>';
                            profilesList.appendChild(li);
                        });
                    }
                }

                // Move to step 6 (success summary)
                wizardCurrentStep = 6;
                renderBootstrapStep();
                
                // Refresh list of organizations and intervals
                fetchOrganizations();
                fetchDeviceIntervals();
            } else {
                showToast(data.error || "Kurulum başarısız oldu!", "error");
                wizBtnNext.disabled = false;
                wizBtnNext.textContent = t("wiz_btn_confirm");
            }
        } catch (err) {
            showToast("Bağlantı hatası oluştu: " + err.toString(), "error");
            wizBtnNext.disabled = false;
            wizBtnNext.textContent = t("wiz_btn_confirm");
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

        // Device table sort
        $$("#dev-table thead th.sortable").forEach(function (th) {
            th.addEventListener("click", function () {
                var key = this.getAttribute("data-sort");
                if (state.devSort.key === key) {
                    state.devSort.dir = state.devSort.dir === "asc" ? "desc" : "asc";
                } else {
                    state.devSort.key = key;
                    state.devSort.dir = "asc";
                }
                state.devPage = 1;
                applyDevFiltersAndRender();
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

        // Setup Wizard Event Listeners
        if (btnTopBootstrap) {
            btnTopBootstrap.addEventListener("click", showBootstrapWizard);
        }
        if (bootModalClose) {
            bootModalClose.addEventListener("click", hideBootstrapWizard);
        }
        if (wizBtnCancel) {
            wizBtnCancel.addEventListener("click", hideBootstrapWizard);
        }
        if (wizBtnPrev) {
            wizBtnPrev.addEventListener("click", prevBootstrapStep);
        }
        if (wizBtnNext) {
            wizBtnNext.addEventListener("click", nextBootstrapStep);
        }
        if (bootModalOverlay) {
            bootModalOverlay.addEventListener("click", function (e) {
                if (e.target === bootModalOverlay) hideBootstrapWizard();
            });
        }

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

        if (devIntSearchInput) {
            devIntSearchInput.addEventListener("input", function () {
                state.devIntSearchQuery = this.value;
                state.devIntPage = 1;
                applyDevIntFiltersAndRender();
            });
        }

        if (devIntPageSizeSelect) {
            devIntPageSizeSelect.addEventListener("change", function () {
                state.devIntPageSize = parseInt(this.value, 10) || 10;
                state.devIntPage = 1;
                applyDevIntFiltersAndRender();
            });
        }

        if (btnDevIntRefresh) {
            btnDevIntRefresh.addEventListener("click", function () {
                fetchDevices("");
                fetchDeviceIntervals();
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

        // Apply console filter if active
        var filterVal = consoleLogFilter ? consoleLogFilter.value.trim().toLowerCase() : "";
        if (filterVal && !line.toLowerCase().includes(filterVal)) {
            el.style.display = "none";
        }

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

    function bindConsoleEvents() {

        if (consoleLogFilter && consoleLogContainer) {
            consoleLogFilter.addEventListener("input", function () {
                var filterVal = this.value.trim().toLowerCase();
                var lines = consoleLogContainer.querySelectorAll(".console-log-line");
                for (var i = 0; i < lines.length; i++) {
                    var el = lines[i];
                    if (!filterVal || el.textContent.toLowerCase().includes(filterVal)) {
                        el.style.display = "";
                    } else {
                        el.style.display = "none";
                    }
                }
                consoleLogContainer.scrollTop = consoleLogContainer.scrollHeight;
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

        var connForm = $("#connections-form");
        if (connForm) {
            connForm.addEventListener("submit", async function (e) {
                e.preventDefault();
                var btn = $("#btn-save-connections");
                if (!btn) return;
                var oldText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bağlanıyor...';

                var payload = {
                    api_server: $("#conn-api-server").value.trim(),
                    api_key: $("#conn-api-key").value.trim(),
                    api_insecure: $("#conn-api-insecure").checked,
                    integration_mqtt_server: $("#conn-integration-mqtt").value.trim(),
                    gateway_mqtt_server: $("#conn-gateway-mqtt").value.trim()
                };

                var ok = await saveSystemConfig(payload);
                
                btn.disabled = false;
                btn.innerHTML = oldText;
            });
        }
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
                    logEntry("User login successful.", "success");
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

                var r = await api("GET", "/api/auth/logout");
                if (r.ok) {
                    stopPolling();
                    if (logSource) {
                        logSource.close();
                        logSource = null;
                    }
                    if (consoleLogContainer) consoleLogContainer.innerHTML = "";
                    logEntry("Session closed.", "info");
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
            logEntry("API connection established.", "success");
        } else {
            logEntry("Failed to connect to API! Is the server running?", "error");
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
        await fetchDeviceIntervals();

        // Load connections settings
        await fetchSystemConfig();

        // Load current state
        await pollStatus();
        startPolling();
    }

    // ─── API Helper: Fetch System Connection Config ────────────────────
    async function fetchSystemConfig() {
        var r = await api("GET", "/api/config");
        if (r.ok) {
            var data = r.data;
            var apiServerInput = $("#conn-api-server");
            var apiKeyInput = $("#conn-api-key");
            var apiInsecureInput = $("#conn-api-insecure");
            var integrationMqttInput = $("#conn-integration-mqtt");
            var gatewayMqttInput = $("#conn-gateway-mqtt");

            if (apiServerInput) apiServerInput.value = data.api_server || "";
            if (apiKeyInput) apiKeyInput.value = data.api_key || "";
            if (apiInsecureInput) apiInsecureInput.checked = !!data.api_insecure;
            if (integrationMqttInput) integrationMqttInput.value = data.integration_mqtt_server || "";
            if (gatewayMqttInput) gatewayMqttInput.value = data.gateway_mqtt_server || "";
            
            logEntry("Connection settings loaded.", "success");
        } else {
            var err = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to load connection settings: " + err, "error");
        }
    }

    // ─── API Helper: Save System Connection Config ─────────────────────
    async function saveSystemConfig(payload) {
        var r = await api("POST", "/api/config", payload);
        if (r.ok) {
            showToast("Bağlantı ayarları başarıyla kaydedildi.", "success");
            logEntry("Connection settings saved and new connections established.", "success");
            
            // Re-load data to ensure we pull using the new connection configuration
            await fetchOrganizations();
            await fetchDeviceProfiles("");
            if (state.netTenantFilter) {
                await fetchApplications(state.netTenantFilter);
            } else {
                await fetchApplications("");
            }
            await fetchDevices("");
            return true;
        } else {
            var err = (r.data && r.data.error) || "Bilinmeyen hata";
            showToast("Hata: " + err, "error");
            logEntry("Failed to update connection settings: " + err, "error");
            return false;
        }
    }

    // ─── Console Custom Theme Settings ─────────────────────────────────
    function initConsoleTheme() {
        updateInputs(activeTheme);

        keys.forEach(function (key) {
            var input = $("#c-color-" + key);
            if (input) {
                input.addEventListener("input", function () {
                    activeTheme[key] = this.value;
                    currentPreset = "custom";
                    var presetSelect = $("#console-theme-preset");
                    if (presetSelect) presetSelect.value = "custom";
                    applyTheme(activeTheme);
                });
            }
        });

        var presetSelect = $("#console-theme-preset");
        if (presetSelect) {
            presetSelect.addEventListener("change", function () {
                var selected = this.value;
                if (selected !== "custom" && presets[selected]) {
                    currentPreset = selected;
                    activeTheme = Object.assign({}, presets[selected]);
                    applyTheme(activeTheme);
                    updateInputs(activeTheme);
                }
            });
        }

        var btnReset = $("#btn-console-theme-reset");
        if (btnReset) {
            btnReset.addEventListener("click", function () {
                currentPreset = "falt-cosmic";
                activeTheme = Object.assign({}, presets["falt-cosmic"]);
                applyTheme(activeTheme);
                updateInputs(activeTheme);
            });
        }

        var btnSave = $("#btn-console-theme-save");
        if (btnSave) {
            btnSave.addEventListener("click", function () {
                localStorage.setItem("console-custom-theme", JSON.stringify(activeTheme));
                localStorage.setItem("console-custom-preset", currentPreset);
                window.location.reload();
            });
        }

        var btnPreviewDark = $("#btn-console-mode-dark");
        var btnPreviewLight = $("#btn-console-mode-light");
        var previewContainer = $("#console-preview");
        if (btnPreviewDark && btnPreviewLight && previewContainer) {
            btnPreviewDark.addEventListener("click", function () {
                btnPreviewDark.classList.add("active");
                btnPreviewLight.classList.remove("active");
                previewContainer.style.background = activeTheme.bg;
                previewContainer.style.color = activeTheme.fg;
            });
            btnPreviewLight.addEventListener("click", function () {
                btnPreviewLight.classList.add("active");
                btnPreviewDark.classList.remove("active");
                previewContainer.style.background = "#ffffff";
                previewContainer.style.color = "#151515";
            });
        }
    }

    function initSettingsSubTabs() {
        var tabButtons = $$(".settings-tab-btn");
        var subContents = $$(".settings-sub-content");
        
        tabButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                var targetTab = this.getAttribute("data-settings-tab");
                
                // Update active class on buttons
                tabButtons.forEach(function (b) {
                    if (b === btn) {
                        b.classList.add("active");
                    } else {
                        b.classList.remove("active");
                    }
                });
                
                // Show/hide sub contents
                subContents.forEach(function (content) {
                    if (content.getAttribute("id") === "settings-sub-" + targetTab) {
                        content.classList.add("active");
                    } else {
                        content.classList.remove("active");
                    }
                });
            });
        });
    }

    // ─── i18n Translations ──────────────────────────────────────────────
    var translations = {
        tr: {
            app_title: "ChirpStack Simülatörü",
            nav_grp_mgmt: "Yönetim",
            nav_organizations: "Organizasyonlar",
            nav_grp_apps: "Uygulamalar",
            nav_networks: "Ağ Uygulamaları",
            nav_device_profiles: "Cihaz Profilleri",
            nav_devices: "Cihazlar",
            nav_grp_system: "Sistem",
            nav_settings: "Ayarlar",
            nav_console: "Konsol",
            nav_info: "Bilgi Notları",
            top_bootstrap: "Yeni Oluştur",
            top_bootstrap_title: "Hızlı Kurulum Sihirbazı",
            top_start: "▶ Başlat",
            top_start_title: "Simülasyonu Başlat",
            top_stop: "■ Durdur",
            top_stop_title: "Simülasyonu Durdur",
            badge_no_conn: "Bağlantı Yok",
            badge_connected: "Bağlantı Var",
            badge_idle: "IDLE",
            badge_running: "RUNNING",
            badge_starting: "STARTING",
            badge_stopping: "STOPPING",
            theme_toggle_title: "Tema Değiştir",
            lang_toggle_title: "Dili Değiştir (Switch Language)",
            console_title: "Canlı Log Konsolu",
            console_subtitle: "Simülasyon cihazlarına ait veri akışını gerçek zamanlı izleyin.",
            console_filter_placeholder: "🔍 Cihaz veya log ara (örn: sim-dev-1)...",
            console_clear: "🧹 Ekranı Temizle",
            console_placeholder: "Simülasyon başlatıldığında canlı loglar burada görünecektir.",
            info_title: "Simülasyon Çalıştırma Kılavuzu",
            info_subtitle: "Simülatörün adım adım kullanım yönergeleri.",
            info_step_1: "<strong>Ağ Yapılandırması:</strong> Sağ çekmeceyi açarak simülasyon ayarlarını düzenleyin ve <em>\"Ayarları Kaydet\"</em> ile kaydedin. Yeni bir ağ kurmak için üst barda bulunan <em>\"Yeni Oluştur\"</em> sihirbazını kullanabilirsiniz.",
            info_step_2: "<strong>Simülasyonu Başlatma:</strong> Üst menüdeki yeşil <strong>\"▶ Başlat\"</strong> butonuna tıklayın. Veritabanındaki tüm organizasyonlar aynı anda paralel çalışmaya başlayacaktır.",
            info_step_3: "<strong>Ağ Katılımı (OTAA):</strong> Cihazlar otomatik olarak ChirpStack üzerinde OTAA katılım isteği gönderir ve onaylandığında veri göndermeye başlar.",
            info_step_4: "<strong>Canlı İzleme ve Filtreleme:</strong> <strong>\"Konsol\"</strong> sekmesinden veri akışını izleyin. Yoğun log akışında arama kutusunu kullanarak spesifik bir cihazı (örn: <code>sim-dev-1</code>) filtreleyin.",
            info_step_5: "<strong>Süre Güncelleme:</strong> Çalışma sırasında <strong>\"Cihazlar\"</strong> listesinden veri sıklığı ayarını (örn: 4 dk) değiştirin. Sistem simülatörü otomatik olarak durdurup yeni ayarla kesintisiz yeniden başlatacaktır.",
            info_step_6: "<strong>Simülasyonu Durdurma:</strong> İstediğiniz zaman üst menüdeki kırmızı <strong>\"🛑 Durdur\"</strong> butonuna basarak tüm cihazları pasif konuma çekebilirsiniz.",
            
            // New Localization Keys
            title_overview: "Organizasyonlar",
            subtitle_overview: "Sistemdeki ana organizasyonları ve üst çatı yapıları yönetin.",
            btn_add_org: "+ Yeni Organizasyon Ekle",
            placeholder_search_org: "Organizasyon ara...",
            table_org_name: "Organizasyon Adı",
            table_org_status: "Durum",
            table_org_id: "ID",
            table_org_net_count: "Ağ Sayısı",
            table_org_dp_count: "Profil Sayısı",
            table_org_dev_count: "Cihaz Sayısı",
            table_org_date: "Kayıt Tarihi",
            table_actions: "İşlemler",
            empty_state_org_title: "Henüz organizasyon yok",
            empty_state_org_text: "Üst bardaki \"Yeni Oluştur\" butonuyla hızlı kurulum yapabilirsiniz.",
            footer_page_size: "Sayfa Başına:",
            footer_total_org: "Toplam: <strong>{count}</strong> Organizasyon",

            title_networks: "Ağ Uygulamaları",
            subtitle_networks: "ChirpStack tenant'larına ait LoRaWAN uygulamalarını yönetin.",
            btn_add_net: "+ Yeni Uygulama",
            select_all_tenants: "Tüm Tenant'lar",
            placeholder_search_net: "Uygulama ara...",
            table_net_name: "Uygulama Adı",
            table_net_org: "Organizasyon",
            empty_state_net_title: "Henüz uygulama yok",
            empty_state_net_text: "Üst bardaki \"Yeni Oluştur\" butonuyla hızlı kurulum yapabilirsiniz.",
            footer_total_net: "Toplam: <strong>{count}</strong> Uygulama",

            title_dp: "Cihaz Profilleri",
            subtitle_dp: "ChirpStack tenant'larına ait LoRaWAN cihaz profillerini yönetin.",
            btn_add_dp: "+ Yeni Cihaz Profili",
            placeholder_search_dp: "Cihaz profili ara...",
            table_dp_name: "Profil Adı",
            table_dp_org: "Organizasyon",
            table_dp_region: "Bölge",
            table_dp_mac: "MAC Versiyon",
            table_dp_otaa: "OTAA",
            empty_state_dp_title: "Henüz cihaz profili yok",
            empty_state_dp_text: "Üst bardaki \"Yeni Oluştur\" butonuyla hızlı kurulum yapabilirsiniz.",
            footer_total_dp: "Toplam: <strong>{count}</strong> Profil",

            title_dev: "Cihazlar",
            subtitle_dev: "ChirpStack uygulamalarına ait LoRaWAN cihazlarını yönetin.",
            btn_add_dev: "+ Yeni Cihaz",
            placeholder_search_dev: "Cihaz ara...",
            table_dev_name: "Cihaz Adı",
            table_dev_org: "Organizasyon",
            table_dev_deveui: "DevEUI",
            table_dev_profile: "Cihaz Profili",
            table_dev_interval: "Sıklık",
            empty_state_dev_title: "Henüz cihaz yok",
            empty_state_dev_text: "Üst bardaki \"Yeni Oluştur\" butonuyla hızlı kurulum yapabilirsiniz.",
            footer_total_dev: "Toplam: <strong>{count}</strong> Cihaz",

            title_settings: "Ayarlar",
            subtitle_settings: "Sistem, bağlantı ve konsol ayarlarını yönetin.",
            settings_grp_account: "Hesap & Sistem",
            settings_tab_general: "Genel Ayarlar",
            settings_tab_connections: "Bağlantı Ayarları",
            settings_tab_theme: "Konsol Teması",
            settings_tab_logs: "Sistem Logları",
            settings_tab_guide: "Simülasyon Rehberi",
            settings_title_general: "Genel Simülasyon Ayarları",
            settings_sec_rf: "RF Parametreleri",
            settings_lbl_freq: "Frekans (Hz)",
            settings_lbl_bw: "Bant Genişliği (Hz)",
            settings_lbl_sf: "Spreading Factor",
            settings_sec_telemetry: "Telemetri Ayarları",
            settings_lbl_uplink_int: "Uplink Aralığı",
            settings_lbl_fport: "FPort",
            settings_lbl_payload: "Payload (hex)",
            settings_sec_timing: "Zamanlama Parametreleri",
            settings_lbl_duration: "Süre (0=süresiz)",
            settings_lbl_act_time: "Aktivasyon Süresi",
            settings_sec_mqtt: "MQTT Topic Şablonları",
            settings_lbl_evt_topic: "Event Topic Şablonu",
            settings_lbl_cmd_topic: "Command Topic Şablonu",
            settings_title_connections: "ChirpStack & Broker Bağlantı Ayarları",
            settings_sec_cs_api: "ChirpStack API",
            settings_lbl_api_host: "ChirpStack API Sunucusu (Host:Port)",
            settings_lbl_api_key: "API Anahtarı (JWT Token)",
            settings_lbl_api_insecure: "Güvensiz Bağlantı (Insecure/TLS'siz)",
            settings_sec_mqtt_brokers: "MQTT Broker Bağlantıları",
            settings_lbl_conn_save: "Kaydet ve Bağlan",
            settings_title_theme: "Konsol Tema Ayarları",
            settings_lbl_theme_presets: "Hazır Temalar (Presets)",
            settings_lbl_preview_mode: "Önizleme Modu",
            settings_mode_dark: "Koyu Mod",
            settings_mode_light: "Açık Mod",
            settings_lbl_color_palette: "Renk Paleti (Swatches)",
            settings_lbl_preview: "Önizleme (Live Preview)",
            settings_btn_theme_reset: "Varsayılana Sıfırla",
            settings_btn_theme_save: "✓ Temayı Kaydet ve Uygula",
            settings_title_logs: "Sistem Logları",
            settings_lang_section: "Uygulama Dili",
            settings_lang_label: "Varsayılan Dil (Language)",

            modal_add_org_title: "Yeni Organizasyon Ekle",
            modal_add_org_name: "Organizasyon Adı *",
            modal_add_org_name_placeholder: "Örn: Test Organizasyonu",
            modal_add_org_name_placeholder_wiz: "Örn: Kullanici-X",
            modal_add_org_ref: "Referans ID (opsiyonel)",
            modal_add_org_ref_placeholder: "Boş bırakılırsa ChirpStack otomatik oluşturur",
            modal_add_org_ref_hint: "Sadece referans amaçlıdır. ChirpStack kendi ID'sini üretir.",
            modal_add_org_desc: "Açıklama (isteğe bağlı)",
            modal_add_org_desc_placeholder: "Örn: Test amaçlı organizasyon",
            btn_cancel: "İptal",
            btn_save: "Kaydet",
            btn_prev: "Geri",
            btn_next: "İleri",

            modal_add_dp_title: "Yeni Cihaz Profili",
            modal_add_dp_tenant: "Tenant *",
            modal_add_dp_desc: "Açıklama (opsiyonel)",
            modal_add_dp_desc_placeholder: "Profil açıklaması",
            modal_add_dp_reg_params: "Bölgesel Parametreler *",
            modal_add_dp_adr: "ADR Algoritması",
            modal_add_dp_otaa_check: "OTAA (Over-The-Air Activation) destekler",
            modal_add_dp_class_b_check: "Class B destekler",
            modal_add_dp_class_c_check: "Class C destekler",
            modal_add_dp_name_placeholder: "Örn: EU868 OTAA Profili",

            modal_add_net_title: "Yeni Uygulama Ekle",
            modal_add_net_tenant: "Tenant (Organizasyon) *",
            modal_add_net_desc: "Açıklama (opsiyonel)",
            modal_add_net_desc_placeholder: "Uygulama açıklaması",
            modal_add_net_name_placeholder: "Örn: Sensor Ağı",

            modal_add_dev_title: "Yeni Cihaz Ekle",
            modal_add_dev_eui_label: "DevEUI * (16 hex karakter)",
            modal_add_dev_app: "Uygulama *",
            modal_add_dev_select_app_first: "Önce uygulama seçin",
            modal_add_dev_desc: "Açıklama (opsiyonel)",
            modal_add_dev_desc_placeholder: "Cihaz açıklaması",
            modal_add_dev_name_placeholder: "Örn: Sensor-001",

            wiz_step_1: "1. Organizasyon",
            wiz_step_2: "2. Ağ",
            wiz_step_3: "3. Cihaz Profili",
            wiz_step_4: "4. Cihaz",
            wiz_step_5: "5. Özet",
            wiz_org_hint: "Oluşturulacak yeni tenant/organizasyon adı.",
            wiz_app_prefix: "Ağ Uygulaması Prefix *",
            wiz_app_count: "Oluşturulacak Ağ Sayısı *",
            wiz_app_count_hint: "Örn: Kullanici-X-ag-1, Kullanici-X-ag-2...",
            wiz_dp_prefix: "Cihaz Profili Ön Eki *",
            wiz_dp_count: "Oluşturulacak Profil Sayısı *",
            wiz_dp_count_hint: "Örn: Kullanici-X-profile-1, Kullanici-X-profile-2...",
            wiz_dev_prefix: "Cihaz Prefix *",
            wiz_dev_count: "Her Ağdaki Cihaz Sayısı *",
            wiz_dev_count_hint: "Her bir ağ uygulamasında oluşturulacak cihaz adedi.",
            wiz_summary_title: "Oluşturulacak Yapılandırma Özeti",
            wiz_summary_subtitle: "Lütfen oluşturulacak cihazlar için veri sıklığı (Interval) ve profil (Profile) atamalarını özelleştirip onaylayın.",
            wiz_summary_org_lbl: "Org:",
            wiz_summary_net_lbl: "Ağ:",
            wiz_summary_dp_lbl: "Profil:",
            wiz_summary_unit: "adet",
            wiz_table_dev_template: "Cihaz Şablonu",
            wiz_summary_confirm_text: "Bu kurulumu onaylıyor musunuz?",
            wiz_success_title: "Kurulum Başarıyla Tamamlandı",
            wiz_success_subtitle: "ChirpStack üzerinden oluşturma teyit raporu",
            wiz_success_org_lbl: "Organizasyon:",
            wiz_success_total_dev_lbl: "Toplam Cihaz:",
            wiz_success_dev_created_unit: "adet cihaz oluşturuldu.",
            wiz_success_net_created_lbl: "Oluşturulan Ağ Uygulamaları:",
            wiz_success_dp_created_lbl: "Oluşturulan Cihaz Profilleri:",
            wiz_btn_confirm: "Onayla ve Oluştur",
            wiz_btn_close: "Kapat",
            wiz_btn_creating: "Oluşturuluyor..."
        },
        en: {
            app_title: "ChirpStack Simulator",
            nav_grp_mgmt: "Management",
            nav_organizations: "Organizations",
            nav_grp_apps: "Applications",
            nav_networks: "Network Applications",
            nav_device_profiles: "Device Profiles",
            nav_devices: "Devices",
            nav_grp_system: "System",
            nav_settings: "Settings",
            nav_console: "Console",
            nav_info: "Info Notes",
            top_bootstrap: "Create New",
            top_bootstrap_title: "Quick Setup Wizard",
            top_start: "▶ Start",
            top_start_title: "Start Simulation",
            top_stop: "■ Stop",
            top_stop_title: "Stop Simulation",
            badge_no_conn: "No Connection",
            badge_connected: "Connected",
            badge_idle: "IDLE",
            badge_running: "RUNNING",
            badge_starting: "STARTING",
            badge_stopping: "STOPPING",
            theme_toggle_title: "Change Theme",
            lang_toggle_title: "Switch Language (Dili Değiştir)",
            console_title: "Live Log Console",
            console_subtitle: "Monitor real-time data streams from simulated devices.",
            console_filter_placeholder: "🔍 Search devices or logs (e.g. sim-dev-1)...",
            console_clear: "🧹 Clear Screen",
            console_placeholder: "Live logs will appear here when simulation starts.",
            info_title: "Simulation Operation Guide",
            info_subtitle: "Step-by-step simulator usage guidelines.",
            info_step_1: "<strong>Network Configuration:</strong> Open the right drawer to edit simulation settings and save with <em>\"Save Settings\"</em>. You can use the <em>\"Create New\"</em> wizard in the top bar to set up a network from scratch.",
            info_step_2: "<strong>Start Simulation:</strong> Click the green <strong>\"▶ Start\"</strong> button in the top menu. All organizations in the database will start running concurrently in parallel.",
            info_step_3: "<strong>Network Join (OTAA):</strong> Devices automatically send an OTAA join request to ChirpStack and begin sending data once activated.",
            info_step_4: "<strong>Live Monitoring & Filtering:</strong> Watch the data stream in the <strong>\"Console\"</strong> tab. In busy streams, use the search box to filter for a specific device (e.g. <code>sim-dev-1</code>).",
            info_step_5: "<strong>Interval Update:</strong> Change the sending frequency of any device in the <strong>\"Devices\"</strong> table while running (e.g., 4 min). The system will automatically stop the simulator, save, and restart it seamlessly.",
            info_step_6: "<strong>Stop Simulation:</strong> Click the red <strong>\"🛑 Stop\"</strong> button in the top menu at any time to set all devices to passive mode.",
            
            // New Localization Keys
            title_overview: "Organizations",
            subtitle_overview: "Manage main organizations and tenants in the system.",
            btn_add_org: "+ Add New Organization",
            placeholder_search_org: "Search organizations...",
            table_org_name: "Organization Name",
            table_org_status: "Status",
            table_org_id: "ID",
            table_org_net_count: "Networks Count",
            table_org_dp_count: "Profiles Count",
            table_org_dev_count: "Devices Count",
            table_org_date: "Registration Date",
            table_actions: "Actions",
            empty_state_org_title: "No organizations yet",
            empty_state_org_text: "You can perform a quick setup using the \"Create New\" button in the top bar.",
            footer_page_size: "Per Page:",
            footer_total_org: "Total: <strong>{count}</strong> Organizations",

            title_networks: "Network Applications",
            subtitle_networks: "Manage LoRaWAN applications belonging to ChirpStack tenants.",
            btn_add_net: "+ New Application",
            select_all_tenants: "All Tenants",
            placeholder_search_net: "Search applications...",
            table_net_name: "Application Name",
            table_net_org: "Organization",
            empty_state_net_title: "No applications yet",
            empty_state_net_text: "You can perform a quick setup using the \"Create New\" button in the top bar.",
            footer_total_net: "Total: <strong>{count}</strong> Applications",

            title_dp: "Device Profiles",
            subtitle_dp: "Manage LoRaWAN device profiles belonging to ChirpStack tenants.",
            btn_add_dp: "+ New Device Profile",
            placeholder_search_dp: "Search device profiles...",
            table_dp_name: "Profile Name",
            table_dp_org: "Organization",
            table_dp_region: "Region",
            table_dp_mac: "MAC Version",
            table_dp_otaa: "OTAA",
            empty_state_dp_title: "No device profiles yet",
            empty_state_dp_text: "You can perform a quick setup using the \"Create New\" button in the top bar.",
            footer_total_dp: "Total: <strong>{count}</strong> Profiles",

            title_dev: "Devices",
            subtitle_dev: "Manage LoRaWAN devices belonging to ChirpStack applications.",
            btn_add_dev: "+ New Device",
            placeholder_search_dev: "Search devices...",
            table_dev_name: "Device Name",
            table_dev_org: "Organization",
            table_dev_deveui: "DevEUI",
            table_dev_profile: "Device Profile",
            table_dev_interval: "Interval",
            empty_state_dev_title: "No devices yet",
            empty_state_dev_text: "You can perform a quick setup using the \"Create New\" button in the top bar.",
            footer_total_dev: "Total: <strong>{count}</strong> Devices",

            title_settings: "Settings",
            subtitle_settings: "Manage system, connection, and console settings.",
            settings_grp_account: "Account & System",
            settings_tab_general: "General Settings",
            settings_tab_connections: "Connection Settings",
            settings_tab_theme: "Console Theme",
            settings_tab_logs: "System Logs",
            settings_tab_guide: "Simulation Guide",
            settings_title_general: "General Simulation Settings",
            settings_sec_rf: "RF Parameters",
            settings_lbl_freq: "Frequency (Hz)",
            settings_lbl_bw: "Bandwidth (Hz)",
            settings_lbl_sf: "Spreading Factor",
            settings_sec_telemetry: "Telemetry Settings",
            settings_lbl_uplink_int: "Uplink Interval",
            settings_lbl_fport: "FPort",
            settings_lbl_payload: "Payload (hex)",
            settings_sec_timing: "Timing Parameters",
            settings_lbl_duration: "Duration (0=infinite)",
            settings_lbl_act_time: "Activation Time",
            settings_sec_mqtt: "MQTT Topic Templates",
            settings_lbl_evt_topic: "Event Topic Template",
            settings_lbl_cmd_topic: "Command Topic Template",
            settings_title_connections: "ChirpStack & Broker Connection Settings",
            settings_sec_cs_api: "ChirpStack API",
            settings_lbl_api_host: "ChirpStack API Server (Host:Port)",
            settings_lbl_api_key: "API Key (JWT Token)",
            settings_lbl_api_insecure: "Insecure Connection (Without TLS)",
            settings_sec_mqtt_brokers: "MQTT Broker Connections",
            settings_lbl_conn_save: "Save and Connect",
            settings_title_theme: "Console Theme Settings",
            settings_lbl_theme_presets: "Presets",
            settings_lbl_preview_mode: "Preview Mode",
            settings_mode_dark: "Dark Mode",
            settings_mode_light: "Light Mode",
            settings_lbl_color_palette: "Color Palette (Swatches)",
            settings_lbl_preview: "Live Preview",
            settings_btn_theme_reset: "Reset to Default",
            settings_btn_theme_save: "✓ Save & Apply Theme",
            settings_title_logs: "System Logs",
            settings_lang_section: "Application Language",
            settings_lang_label: "Language",

            modal_add_org_title: "Add New Organization",
            modal_add_org_name: "Organization Name *",
            modal_add_org_name_placeholder: "e.g. Test Organization",
            modal_add_org_name_placeholder_wiz: "e.g. User-X",
            modal_add_org_ref: "Reference ID (optional)",
            modal_add_org_ref_placeholder: "Leave empty for auto-generation",
            modal_add_org_ref_hint: "For reference only. ChirpStack generates its own ID.",
            modal_add_org_desc: "Description (optional)",
            modal_add_org_desc_placeholder: "e.g. Organization for testing",
            btn_cancel: "Cancel",
            btn_save: "Save",
            btn_prev: "Back",
            btn_next: "Next",

            modal_add_dp_title: "New Device Profile",
            modal_add_dp_tenant: "Tenant *",
            modal_add_dp_desc: "Description (optional)",
            modal_add_dp_desc_placeholder: "Profile description",
            modal_add_dp_reg_params: "Regional Parameters *",
            modal_add_dp_adr: "ADR Algorithm",
            modal_add_dp_otaa_check: "Supports OTAA (Over-The-Air Activation)",
            modal_add_dp_class_b_check: "Supports Class B",
            modal_add_dp_class_c_check: "Supports Class C",
            modal_add_dp_name_placeholder: "e.g. EU868 OTAA Profile",

            modal_add_net_title: "Add New Application",
            modal_add_net_tenant: "Tenant (Organization) *",
            modal_add_net_desc: "Description (optional)",
            modal_add_net_desc_placeholder: "Application description",
            modal_add_net_name_placeholder: "e.g. Sensor Network",

            modal_add_dev_title: "Add New Device",
            modal_add_dev_eui_label: "DevEUI * (16 hex chars)",
            modal_add_dev_app: "Application *",
            modal_add_dev_select_app_first: "Select application first",
            modal_add_dev_desc: "Description (optional)",
            modal_add_dev_desc_placeholder: "Device description",
            modal_add_dev_name_placeholder: "e.g. Sensor-001",

            wiz_step_1: "1. Organization",
            wiz_step_2: "2. Network",
            wiz_step_3: "3. Profile",
            wiz_step_4: "4. Device",
            wiz_step_5: "5. Summary",
            wiz_org_hint: "New tenant/organization name to be created.",
            wiz_app_prefix: "Network Application Prefix *",
            wiz_app_count: "Networks to Create *",
            wiz_app_count_hint: "e.g. User-X-ag-1, User-X-ag-2...",
            wiz_dp_prefix: "Device Profile Prefix *",
            wiz_dp_count: "Profiles to Create *",
            wiz_dp_count_hint: "e.g. User-X-profile-1, User-X-profile-2...",
            wiz_dev_prefix: "Device Prefix *",
            wiz_dev_count: "Devices per Network *",
            wiz_dev_count_hint: "Number of devices to create in each network application.",
            wiz_summary_title: "Configuration Summary",
            wiz_summary_subtitle: "Please customize LoRaWAN uplink intervals and profiles before confirming.",
            wiz_summary_org_lbl: "Org:",
            wiz_summary_net_lbl: "Net:",
            wiz_summary_dp_lbl: "Profile:",
            wiz_summary_unit: "qty",
            wiz_table_dev_template: "Device Template",
            wiz_summary_confirm_text: "Do you confirm this setup?",
            wiz_success_title: "Setup Completed Successfully",
            wiz_success_subtitle: "ChirpStack creation confirmation report",
            wiz_success_org_lbl: "Organization:",
            wiz_success_total_dev_lbl: "Total Devices:",
            wiz_success_dev_created_unit: "devices created.",
            wiz_success_net_created_lbl: "Created Network Applications:",
            wiz_success_dp_created_lbl: "Created Device Profiles:",
            wiz_btn_confirm: "Confirm & Create",
            wiz_btn_close: "Close",
            wiz_btn_creating: "Creating..."
        }
    };

    function t(key) {
        var lang = state.language || "tr";
        var dict = translations[lang] || translations["tr"];
        return dict[key] || key;
    }

    function translateDOM() {
        var elements = document.querySelectorAll("[data-i18n]");
        elements.forEach(function (el) {
            var key = el.getAttribute("data-i18n");
            var translation = t(key);
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.placeholder = translation;
            } else if (el.tagName === "OPTION") {
                el.textContent = translation;
            } else {
                if (el.getAttribute("data-i18n-html") === "true") {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
        placeholders.forEach(function (el) {
            var key = el.getAttribute("data-i18n-placeholder");
            el.placeholder = t(key);
        });

        var titles = document.querySelectorAll("[data-i18n-title]");
        titles.forEach(function (el) {
            var key = el.getAttribute("data-i18n-title");
            el.title = t(key);
        });

        document.title = t("app_title");
    }

    // ─── Init ──────────────────────────────────────────────────────────
    async function init() {
        bindSettingsEvents();
        bindAuthEvents();
        initSettingsSubTabs();
        
        // Language Selector dropdown change listener
        if (appLanguageSelect) {
            appLanguageSelect.value = state.language;
            appLanguageSelect.addEventListener("change", function (e) {
                state.language = this.value;
                localStorage.setItem("sim_language", state.language);
                translateDOM();
                updatePageTitle();
                // Refresh dynamic tables to apply translations
                applyFiltersAndRender();
                applyDpFiltersAndRender();
                applyNetFiltersAndRender();
                applyDevFiltersAndRender();
            });
        }

        // Apply translations on load
        translateDOM();
        updatePageTitle();
        
        // Load saved console/system theme
        var savedTheme = localStorage.getItem("console-custom-theme");
        var savedPresetName = localStorage.getItem("console-custom-preset");
        if (savedTheme) {
            try {
                activeTheme = JSON.parse(savedTheme);
                if (savedPresetName) currentPreset = savedPresetName;
            } catch(e) {}
        }
        applyTheme(activeTheme);

        // Update top-right button text/icon
        var currentIsLight = isLightColor(activeTheme.bg);
        if (themeToggle) {
            themeToggle.textContent = currentIsLight ? "☀" : "🌙";
        }

        bindConsoleEvents();
        initConsoleTheme();

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
