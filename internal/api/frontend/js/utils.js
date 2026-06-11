import { state } from "./state.js";

// DOM Helpers
export const $ = sel => document.querySelector(sel);
export const $$ = sel => document.querySelectorAll(sel);

// HTML Escape helper
export function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Notifications: Toast and Logger
let toastTimer = null;
export function showToast(msg, type = "error") {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    toast.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
}

export function logEntry(msg, level = "info") {
    const logContainer = $("#log-container");
    if (!logContainer) return;
    const now = new Date();
    const ts = [
        now.getHours().toString().padStart(2, "0"),
        now.getMinutes().toString().padStart(2, "0"),
        now.getSeconds().toString().padStart(2, "0")
    ].join(":");

    const el = document.createElement("div");
    el.className = `log-entry log-${level}`;
    el.textContent = `[${ts}] ${msg}`;
    logContainer.appendChild(el);

    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Drawers (Main Org Config and Detailed Views)
export function openDrawer(title, subtitle, mode) {
    const drawerOverlay = $("#drawer-overlay");
    const drawerTitle = $("#drawer-title");
    const drawerSubtitle = $("#drawer-subtitle");
    const drawerEl = $("#org-drawer");
    state.drawerOpen = true;
    state.drawerMode = mode || "edit";
    if (drawerOverlay) drawerOverlay.classList.add("open");
    if (drawerEl) drawerEl.classList.add("open");
    if (drawerTitle) drawerTitle.textContent = title;
    if (drawerSubtitle) drawerSubtitle.textContent = subtitle;
}

export function closeDrawer() {
    const drawerOverlay = $("#drawer-overlay");
    const drawerEl = $("#org-drawer");
    state.drawerOpen = false;
    if (drawerOverlay) drawerOverlay.classList.remove("open");
    if (drawerEl) drawerEl.classList.remove("open");
}

export function openDetailsDrawer(title, subtitle, htmlContent) {
    const detailsDrawerOverlay = $("#details-drawer-overlay");
    const detailsDrawerTitle = $("#details-drawer-title");
    const detailsDrawerSubtitle = $("#details-drawer-subtitle");
    const detailsDrawerBody = $("#details-drawer-body");
    const detailsDrawerEl = $("#details-drawer");

    if (detailsDrawerTitle) detailsDrawerTitle.textContent = title;
    if (detailsDrawerSubtitle) detailsDrawerSubtitle.textContent = subtitle;
    if (detailsDrawerBody) detailsDrawerBody.innerHTML = htmlContent;
    if (detailsDrawerEl) detailsDrawerEl.classList.add("open");
    if (detailsDrawerOverlay) detailsDrawerOverlay.classList.add("open");
}

export function closeDetailsDrawer() {
    const detailsDrawerOverlay = $("#details-drawer-overlay");
    const detailsDrawerEl = $("#details-drawer");
    if (detailsDrawerEl) detailsDrawerEl.classList.remove("open");
    if (detailsDrawerOverlay) detailsDrawerOverlay.classList.remove("open");
}

// Color and Theme Constants / Helpers
export const presets = {
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

export const keys = ["fg", "bg", "cu", "ca", "sb", "sf", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];

export function normalizeHex(hex) {
    if (!hex) return "#000000";
    hex = hex.trim();
    if (hex.startsWith("#")) hex = hex.slice(1);
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return "#" + hex;
}

export function hexToRgb(hex) {
    hex = normalizeHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

export function adjustColorBrightness(hex, percent) {
    hex = normalizeHex(hex);
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    const amt = Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

export function isLightColor(hex) {
    hex = normalizeHex(hex);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 128;
}

export function applyGlobalTheme(themeObj) {
    const root = document.documentElement;
    if (!root) return;

    const bg = normalizeHex(themeObj.bg);
    const fg = normalizeHex(themeObj.fg);
    const cu = normalizeHex(themeObj.cu);
    const sb = normalizeHex(themeObj.sb);

    const isLight = isLightColor(bg);

    let bgDeepest, bgCard, bgField, bgSidebar, bgSecSidebar;
    let text, textDim;
    let border, borderSoft;

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

    const accent = cu;
    const accentHover = adjustColorBrightness(cu, isLight ? -10 : 10);
    const accentSoft = `rgba(${hexToRgb(cu)}, 0.12)`;
    const accentFg = isLightColor(accent) ? "#0f172a" : "#ffffff";

    const green = normalizeHex(themeObj[2] || themeObj[10] || "#22c55e");
    const red = normalizeHex(themeObj[1] || themeObj[9] || "#ef4444");
    const yellow = normalizeHex(themeObj[3] || themeObj[11] || "#eab308");
    const blue = normalizeHex(themeObj[4] || themeObj[12] || "#3b82f6");

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
    root.style.setProperty("--accent-fg", accentFg);

    root.style.setProperty("--green", green);
    root.style.setProperty("--red", red);
    root.style.setProperty("--yellow", yellow);
    root.style.setProperty("--blue", blue);

    for (let i = 0; i <= 15; i++) {
        const val = themeObj[i] || presets["falt-cosmic"][i];
        root.style.setProperty("--ansi-" + i, normalizeHex(val));
    }

    if (isLight) {
        document.body.classList.add("light-theme");
    } else {
        document.body.classList.remove("light-theme");
    }
}

export function updateMapTileUrl() {
    if (!state.map || !state.mapTileLayer || !state.activeTheme) return;
    const isLight = isLightColor(state.activeTheme.bg);
    const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    state.mapTileLayer.setUrl(tileUrl);
}

export function applyTheme(themeObj) {
    state.activeTheme = Object.assign({}, themeObj);
    const targets = [$("#console-log-container"), $("#console-preview")];
    targets.forEach(el => {
        if (!el) return;
        el.style.setProperty("--c-fg", themeObj.fg);
        el.style.setProperty("--c-bg", themeObj.bg);
        el.style.setProperty("--c-cu", themeObj.cu);
        el.style.setProperty("--c-ca", themeObj.ca);
        el.style.setProperty("--c-sb", themeObj.sb);
        el.style.setProperty("--c-sf", themeObj.sf);
        keys.forEach(key => {
            if (key !== "fg" && key !== "bg" && key !== "cu" && key !== "ca" && key !== "sb" && key !== "sf") {
                el.style.setProperty("--c-ansi-" + key, themeObj[key]);
            }
        });
    });
    applyGlobalTheme(themeObj);
    updateMapTileUrl();
}

export function showLoginScreen() {
    const loginOverlay = $("#login-overlay");
    const loginUsername = $("#login-username");
    const loginPassword = $("#login-password");
    const loginError = $("#login-error");
    if (loginOverlay) loginOverlay.style.display = "flex";
    if (loginUsername) {
        loginUsername.value = "";
        loginPassword.value = "";
        if (loginError) loginError.style.display = "none";
        setTimeout(() => loginUsername.focus(), 100);
    }
}

export function hideLoginScreen() {
    const loginOverlay = $("#login-overlay");
    if (loginOverlay) loginOverlay.style.display = "none";
}
