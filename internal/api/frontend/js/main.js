import { state } from "./state.js";
import { $, $$, showToast, logEntry, showLoginScreen, hideLoginScreen, applyTheme, isLightColor, presets, closeDrawer, closeDetailsDrawer } from "./utils.js";
import { api } from "./api.js";
import { t, translateDOM } from "./translate.js";

// Tab initializers
import { initOrgsTab, fetchOrganizations } from "./tabs/orgs.js";
import { initNetworksTab, fetchApplications, populateNetFilterTenantSelect } from "./tabs/networks.js";
import { initDevicesTab, fetchDeviceProfiles, populateDpFilterTenantSelect } from "./tabs/devices.js";
import { initDeviceListTab, fetchDevices, populateDevFilterTenantSelect } from "./tabs/device-list.js";
import { initDeviceStatusTab, fetchSimulationDevices } from "./tabs/device-status.js";
import { initSettingsTab, fetchSystemConfig } from "./tabs/settings.js";
import { initConsoleTab, initConsoleTheme, toggleTheme, activeTheme, currentPreset } from "./tabs/console.js";
import { initSystemLogsTab, renderSystemLogs, purgeOldIndexedDBLogs } from "./tabs/system-logs.js";
import { initDashboard, initMap, initChart, checkHealth, stopPolling } from "./tabs/dashboard.js";

// Wizard initializers
import { initDpWizard } from "./wizards/dp-wizard.js";
import { initNetWizard } from "./wizards/network-wizard.js";
import { initBootstrapWizard } from "./wizards/bootstrap-wizard.js";
import { initDevWizard } from "./wizards/dev-wizard.js";

// Page Title update helper
export function updatePageTitle() {
    const titles = {
        overview: t("nav_organizations"),
        "live-map": t("nav_live_map"),
        devices: t("nav_device_profiles"),
        networks: t("nav_networks"),
        "device-list": t("nav_devices"),
        "device-status": t("nav_device_status"),
        "log-center": t("nav_log_center"),
        settings: t("nav_settings"),
        info: t("info_title")
    };
    const pageTitleBar = $("#page-title-bar");
    if (pageTitleBar) {
        pageTitleBar.textContent = titles[state.currentTab] || "Overview";
    }
}

// Switch tabs and load corresponding content dynamically
export function switchTab(name) {
    state.currentTab = name;

    // Hide all tab contents
    const contents = $$(".tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].classList.remove("active");
    }

    // Show selected tab content
    const targetContent = $("#content-" + name);
    if (targetContent) targetContent.classList.add("active");

    // Update active state in sidebar nav links
    $$(".secondary-nav-link").forEach((link) => {
        if (link.getAttribute("data-tab") === name) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    updatePageTitle();

    // Trigger tab-specific fetches
    if (name === "overview") {
        fetchOrganizations();
    } else if (name === "live-map") {
        fetchOrganizations();
        fetchDevices("").then(() => {
            if (state.map) {
                setTimeout(() => {
                    state.map.invalidateSize();
                }, 100);
            }
        });
        if (!state.metricsChart) {
            initChart();
        }
    } else if (name === "devices") {
        fetchDeviceProfiles(state.dpTenantFilter);
    } else if (name === "networks") {
        fetchApplications(state.netTenantFilter);
    } else if (name === "device-list") {
        fetchDevices(state.devTenantFilter);
    } else if (name === "device-status") {
        fetchSimulationDevices();
    } else if (name === "log-center") {
        renderSystemLogs();
    }
}

async function checkAuthStatus() {
    const r = await api("GET", "/api/auth/status");
    return (r.ok && r.data && r.data.authenticated);
}

async function loadDashboardData() {
    // Purge old IndexedDB logs
    purgeOldIndexedDBLogs();

    // Start streaming console logs from SSE
    import("./tabs/console.js").then(m => m.connectLogStream());

    // Health check
    const online = await checkHealth();
    if (online) {
        logEntry("API connection established.", "success");
    } else {
        logEntry("Failed to connect to API! Is the server running?", "error");
    }

    // Fetch primary data sources
    await fetchOrganizations();
    populateDpFilterTenantSelect();
    await fetchDeviceProfiles("");

    populateNetFilterTenantSelect();
    populateDevFilterTenantSelect();
    await fetchApplications(state.netTenantFilter);

    await fetchDevices("");
    
    // Load system settings
    await fetchSystemConfig();
}

// Global Event Listeners Registration
function registerGlobalEvents() {
    // Tab switching event registration
    $$(".secondary-nav-link[data-tab]").forEach((link) => {
        link.addEventListener("click", function () {
            const tab = this.getAttribute("data-tab");
            const secondarySidebar = $("#secondary-sidebar");
            const hamburgerBtn = $("#hamburger-btn");
            if (tab) switchTab(tab);
            if (window.innerWidth <= 900 && secondarySidebar) {
                secondarySidebar.classList.remove("open");
                if (hamburgerBtn) hamburgerBtn.textContent = "☰";
            }
        });
    });

    // Navigation groups expansion/collapse toggle
    $$(".secondary-nav-group-header").forEach((header) => {
        header.addEventListener("click", function () {
            const groupId = this.getAttribute("data-group");
            const groupHeader = document.querySelector('[data-group="' + groupId + '"]');
            if (groupHeader) {
                const group = groupHeader.closest(".secondary-nav-group");
                if (group) group.classList.toggle("open");
            }
        });
    });

    // Theme toggler click event
    const themeToggle = $("#theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }

    // Sidebar toggles for mobile viewports
    const hamburgerBtn = $("#hamburger-btn");
    const secondarySidebar = $("#secondary-sidebar");
    const sidebarCloseBtn = $("#sidebar-close-btn");
    if (hamburgerBtn && secondarySidebar) {
        hamburgerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            secondarySidebar.classList.toggle("open");
            const isOpen = secondarySidebar.classList.contains("open");
            hamburgerBtn.textContent = isOpen ? "✕" : "☰";
        });
    }
    if (sidebarCloseBtn && secondarySidebar) {
        sidebarCloseBtn.addEventListener("click", (e) => {
            e.preventDefault();
            secondarySidebar.classList.remove("open");
            if (hamburgerBtn) hamburgerBtn.textContent = "☰";
        });
    }

    // Dismiss sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
        if (secondarySidebar && secondarySidebar.classList.contains("open")) {
            if (!secondarySidebar.contains(e.target) && hamburgerBtn && !hamburgerBtn.contains(e.target)) {
                secondarySidebar.classList.remove("open");
                hamburgerBtn.textContent = "☰";
            }
        }
    });

    // Overlay dismiss listeners for drawers
    const drawerOverlay = $("#drawer-overlay");
    if (drawerOverlay) {
        drawerOverlay.addEventListener("click", (e) => {
            if (e.target === drawerOverlay) {
                closeDrawer();
            }
        });
    }
    const detailsDrawerOverlay = $("#details-drawer-overlay");
    const detailsDrawerClose = $("#details-drawer-close");
    if (detailsDrawerOverlay) {
        detailsDrawerOverlay.addEventListener("click", (e) => {
            if (e.target === detailsDrawerOverlay) {
                closeDetailsDrawer();
            }
        });
    }
    if (detailsDrawerClose) {
        detailsDrawerClose.addEventListener("click", () => {
            closeDetailsDrawer();
        });
    }

    // Authentication Form Handlers
    const loginForm = $("#login-form");
    const loginUsername = $("#login-username");
    const loginPassword = $("#login-password");
    const btnLoginSubmit = $("#btn-login-submit");
    const loginError = $("#login-error");
    const btnLogout = $("#btn-logout");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = loginUsername ? loginUsername.value.trim() : "";
            const password = loginPassword ? loginPassword.value : "";

            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = true;
                btnLoginSubmit.textContent = t("Giriş yapılıyor...") || "Giriş yapılıyor...";
            }

            const r = await api("POST", "/api/auth/login", {
                username: username,
                password: password
            });

            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = false;
                btnLoginSubmit.textContent = t("Giriş Yap") || "Giriş Yap";
            }

            if (r.ok) {
                hideLoginScreen();
                logEntry("User login successful.", "success");
                showToast("Giriş başarılı.", "success");
                await loadDashboardData();
            } else {
                const errMsg = (r.data && r.data.error) || "Giriş başarısız.";
                if (loginError) {
                    loginError.textContent = errMsg;
                    loginError.style.display = "block";
                }
                if (loginPassword) {
                    loginPassword.value = "";
                    loginPassword.focus();
                }
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            const r = await api("GET", "/api/auth/logout");
            if (r.ok) {
                stopPolling();
                import("./tabs/console.js").then((m) => {
                    if (m.logSource) {
                        m.logSource.close();
                    }
                });
                const consoleLogContainer = $("#console-log-container");
                if (consoleLogContainer) consoleLogContainer.innerHTML = "";
                logEntry("Session closed.", "info");
                showLoginScreen();
            } else {
                showToast("Çıkış hatası", "error");
            }
        });
    }
}

// DOM Initializer Entrypoint
async function init() {
    // Initialize tab and wizard UI components
    initOrgsTab();
    initNetworksTab();
    initDevicesTab();
    initDeviceListTab();
    initDeviceStatusTab();
    initSettingsTab();
    initConsoleTab();
    initSystemLogsTab();
    initDashboard();

    initDpWizard();
    initNetWizard();
    initBootstrapWizard();
    initDevWizard();

    // Register all top-level layout event listeners
    registerGlobalEvents();

    // Language selector element initialization
    const appLanguageSelect = $("#app-language-select");
    if (appLanguageSelect) {
        appLanguageSelect.value = state.language;
        appLanguageSelect.addEventListener("change", function () {
            state.language = this.value;
            localStorage.setItem("sim_language", state.language);
            translateDOM();
            updatePageTitle();
            
            // Refresh translation lists on language change
            import("./tabs/orgs.js").then(m => m.applyFiltersAndRender());
            import("./tabs/devices.js").then(m => m.applyDpFiltersAndRender());
            import("./tabs/networks.js").then(m => m.applyAppFiltersAndRender());
            import("./tabs/device-list.js").then(m => m.applyDevFiltersAndRender());
            import("./tabs/device-status.js").then(m => m.applyDevStatusFiltersAndRender());
        });
    }

    // Initialize translations & UI page title
    translateDOM();
    updatePageTitle();

    // Set theme custom presets
    applyTheme(activeTheme);

    const themeToggle = $("#theme-toggle");
    if (themeToggle) {
        themeToggle.textContent = isLightColor(activeTheme.bg) ? "☀" : "🌙";
    }

    // Set defaults console preferences
    initConsoleTheme();

    // Check user login session
    const authenticated = await checkAuthStatus();
    if (authenticated) {
        hideLoginScreen();
        await loadDashboardData();
        switchTab("live-map");
    } else {
        showLoginScreen();
    }
}

// Trigger initialization when DOM is loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
