import { state } from "../state.js";
import { $, $$, escapeHtml, isLightColor, presets, keys, applyTheme } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

// Tab dependencies will be imported dynamically
import { pulseDeviceMarkerAndLine } from "./dashboard.js";

export let activeTheme = Object.assign({}, presets["falt-cosmic"]);
export let currentPreset = "falt-cosmic";
export let logSource = null;

// Initialize theme from localStorage on module evaluation
const savedTheme = localStorage.getItem("console-custom-theme");
const savedPresetName = localStorage.getItem("console-custom-preset");
if (savedTheme) {
    try {
        activeTheme = JSON.parse(savedTheme);
        if (savedPresetName) currentPreset = savedPresetName;
    } catch(e) {}
}

export function updateInputs(themeObj) {
    keys.forEach((key) => {
        const input = $("#c-color-" + key);
        if (input) {
            input.value = themeObj[key];
        }
    });
    const presetSelect = $("#console-theme-preset");
    if (presetSelect) presetSelect.value = currentPreset;
}

export function toggleTheme() {
    const themeToggle = $("#theme-toggle");
    const isLight = isLightColor(activeTheme.bg);
    if (isLight) {
        // Switching from light to dark
        let savedPreset = localStorage.getItem("console-last-dark-preset") || "solarized-dark";
        let savedThemeStr = localStorage.getItem("console-last-dark-theme");
        
        if (savedPreset === "custom" && savedThemeStr) {
            currentPreset = "custom";
            activeTheme = JSON.parse(savedThemeStr);
        } else {
            if (!presets[savedPreset]) {
                savedPreset = "solarized-dark";
            }
            currentPreset = savedPreset;
            activeTheme = Object.assign({}, presets[savedPreset]);
        }
    } else {
        // Switching from dark to light
        let savedPreset = localStorage.getItem("console-last-light-preset") || "solarized-light";
        let savedThemeStr = localStorage.getItem("console-last-light-theme");
        
        if (savedPreset === "custom" && savedThemeStr) {
            currentPreset = "custom";
            activeTheme = JSON.parse(savedThemeStr);
        } else {
            if (!presets[savedPreset]) {
                savedPreset = "solarized-light";
            }
            currentPreset = savedPreset;
            activeTheme = Object.assign({}, presets[savedPreset]);
        }
    }
    applyTheme(activeTheme);
    updateInputs(activeTheme);

    // Save current active theme
    localStorage.setItem("console-custom-theme", JSON.stringify(activeTheme));
    localStorage.setItem("console-custom-preset", currentPreset);

    // Update respective last-mode variables
    const currentIsLight = isLightColor(activeTheme.bg);
    if (currentIsLight) {
        localStorage.setItem("console-last-light-preset", currentPreset);
        localStorage.setItem("console-last-light-theme", JSON.stringify(activeTheme));
    } else {
        localStorage.setItem("console-last-dark-preset", currentPreset);
        localStorage.setItem("console-last-dark-theme", JSON.stringify(activeTheme));
    }

    if (themeToggle) {
        themeToggle.textContent = currentIsLight ? "☀" : "🌙";
    }
}

export function appendConsoleLog(line) {
    const consoleLogContainer = $("#console-log-container");
    if (!consoleLogContainer) return;
    const placeholder = consoleLogContainer.querySelector(".console-placeholder");
    if (placeholder) {
        placeholder.remove();
    }

    // Parse and translate UTC/RFC3339 timestamp to local timezone timestamp
    const match = line.match(/^\[([^\]]+)\]/);
    if (match) {
        const rawTs = match[1];
        const date = new Date(rawTs);
        if (!isNaN(date.getTime())) {
            const localTs = [
                date.getHours().toString().padStart(2, "0"),
                date.getMinutes().toString().padStart(2, "0"),
                date.getSeconds().toString().padStart(2, "0")
            ].join(":");
            line = line.replace(rawTs, localTs);
        }
    }

    const el = document.createElement("div");
    el.className = "console-log-line";

    const lowerLine = line.toLowerCase();
    const isRemote = lowerLine.includes("as/integration") || lowerLine.includes("[chirpstack integration]") || lowerLine.includes("as/debug");
    el.dataset.source = isRemote ? "remote" : "local";

    if (isRemote) {
        el.style.color = "#22d3ee"; // cyan for ChirpStack integration logs
    } else if (lowerLine.includes(" level=error") || lowerLine.includes("error:") || lowerLine.includes(" level=fatal")) {
        el.style.color = "var(--red)";
    } else if (lowerLine.includes(" level=warn") || lowerLine.includes("warn:")) {
        el.style.color = "var(--yellow)";
    } else if (lowerLine.includes("received downlink") || lowerLine.includes("downlink frame") || lowerLine.includes("received downlink data") || lowerLine.includes("otaa activated") || lowerLine.includes("join accept")) {
        el.style.color = "var(--blue)";
    } else if (lowerLine.includes("send uplink") || lowerLine.includes("uplink frame sent") || lowerLine.includes("send otaa")) {
        el.style.color = "var(--accent)";
    }

    el.textContent = line;

    // Apply console filter if active
    const consoleSourceSelect = $("#console-source-select");
    const consoleLogFilter = $("#console-log-filter");
    const sourceVal = consoleSourceSelect ? consoleSourceSelect.value : "all";
    const filterVal = consoleLogFilter ? consoleLogFilter.value.trim().toLowerCase() : "";
    
    const matchesSource = (sourceVal === "all") || (el.dataset.source === sourceVal);
    const matchesText = !filterVal || line.toLowerCase().includes(filterVal);

    if (matchesSource && matchesText) {
        el.style.display = "";
    } else {
        el.style.display = "none";
    }

    consoleLogContainer.appendChild(el);

    while (consoleLogContainer.children.length > 300) {
        consoleLogContainer.removeChild(consoleLogContainer.firstChild);
    }

    // Map live telemetry pulsing
    if (state.map && (lowerLine.includes("uplink") || lowerLine.includes("otaa activated") || lowerLine.includes("payload"))) {
        const jsonMatch = line.match(/\{"app_name".*\}$/);
        if (jsonMatch) {
            try {
                const meta = JSON.parse(jsonMatch[0]);
                if (meta && meta.dev_eui) {
                    pulseDeviceMarkerAndLine(meta.dev_eui);
                }
            } catch (e) {
                // Ignore JSON parsing errors
            }
        }
    }

    consoleLogContainer.scrollTop = consoleLogContainer.scrollHeight;
}

export function connectLogStream() {
    if (logSource) {
        logSource.close();
    }
    logSource = new EventSource("/api/logs/stream");

    logSource.onmessage = (event) => {
        appendConsoleLog(event.data);
    };

    logSource.onerror = (err) => {
        console.error("SSE connection error:", err);
        if (logSource) {
            logSource.close();
            logSource = null;
        }
        api("GET", "/api/auth/status").then((r) => {
            if (r.ok && r.data && r.data.authenticated) {
                setTimeout(connectLogStream, 3000);
            }
        });
    };
}

export function applyConsoleFilters() {
    const consoleLogContainer = $("#console-log-container");
    if (!consoleLogContainer) return;
    const consoleSourceSelect = $("#console-source-select");
    const consoleLogFilter = $("#console-log-filter");
    const sourceVal = consoleSourceSelect ? consoleSourceSelect.value : "all";
    const filterVal = consoleLogFilter ? consoleLogFilter.value.trim().toLowerCase() : "";
    const lines = consoleLogContainer.querySelectorAll(".console-log-line");
    
    for (let i = 0; i < lines.length; i++) {
        const el = lines[i];
        const matchesSource = (sourceVal === "all") || (el.dataset.source === sourceVal);
        const matchesText = !filterVal || el.textContent.toLowerCase().includes(filterVal);
        
        if (matchesSource && matchesText) {
            el.style.display = "";
        } else {
            el.style.display = "none";
        }
    }
    consoleLogContainer.scrollTop = consoleLogContainer.scrollHeight;
}

export function initConsoleTheme() {
    updateInputs(activeTheme);

    keys.forEach((key) => {
        const input = $("#c-color-" + key);
        if (input) {
            input.addEventListener("input", function () {
                activeTheme[key] = this.value;
                currentPreset = "custom";
                const presetSelect = $("#console-theme-preset");
                if (presetSelect) presetSelect.value = "custom";
                applyTheme(activeTheme);
            });
        }
    });

    const presetSelect = $("#console-theme-preset");
    if (presetSelect) {
        presetSelect.addEventListener("change", function () {
            const selected = this.value;
            if (selected !== "custom" && presets[selected]) {
                currentPreset = selected;
                activeTheme = Object.assign({}, presets[selected]);
                applyTheme(activeTheme);
                updateInputs(activeTheme);
            }
        });
    }

    const btnReset = $("#btn-console-theme-reset");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            currentPreset = "falt-cosmic";
            activeTheme = Object.assign({}, presets["falt-cosmic"]);
            applyTheme(activeTheme);
            updateInputs(activeTheme);
        });
    }

    const btnSave = $("#btn-console-theme-save");
    if (btnSave) {
        btnSave.addEventListener("click", () => {
            localStorage.setItem("console-custom-theme", JSON.stringify(activeTheme));
            localStorage.setItem("console-custom-preset", currentPreset);
            
            const isLight = isLightColor(activeTheme.bg);
            if (isLight) {
                localStorage.setItem("console-last-light-preset", currentPreset);
                localStorage.setItem("console-last-light-theme", JSON.stringify(activeTheme));
            } else {
                localStorage.setItem("console-last-dark-preset", currentPreset);
                localStorage.setItem("console-last-dark-theme", JSON.stringify(activeTheme));
            }
            
            window.location.reload();
        });
    }

    const btnPreviewDark = $("#btn-console-mode-dark");
    const btnPreviewLight = $("#btn-console-mode-light");
    const previewContainer = $("#console-preview");
    if (btnPreviewDark && btnPreviewLight && previewContainer) {
        btnPreviewDark.addEventListener("click", () => {
            btnPreviewDark.classList.add("active");
            btnPreviewLight.classList.remove("active");
            previewContainer.style.background = activeTheme.bg;
            previewContainer.style.color = activeTheme.fg;
        });
        btnPreviewLight.addEventListener("click", () => {
            btnPreviewLight.classList.add("active");
            btnPreviewDark.classList.remove("active");
            previewContainer.style.background = "#ffffff";
            previewContainer.style.color = "#151515";
        });
    }
}

export function initConsoleTab() {
    const consoleLogFilter = $("#console-log-filter");
    const consoleSourceSelect = $("#console-source-select");
    const btnConsoleClear = $("#btn-console-clear");
    const consoleLogContainer = $("#console-log-container");

    if (consoleLogFilter) {
        consoleLogFilter.addEventListener("input", applyConsoleFilters);
    }
    if (consoleSourceSelect) {
        consoleSourceSelect.addEventListener("change", applyConsoleFilters);
    }

    if (btnConsoleClear && consoleLogContainer) {
        btnConsoleClear.addEventListener("click", (e) => {
            e.stopPropagation();
            consoleLogContainer.innerHTML = "";
            if (state.currentStatus !== "running" && state.currentStatus !== "starting") {
                const ph = document.createElement("div");
                ph.className = "console-placeholder";
                ph.textContent = "Simulasyon baslatildiginda canli loglar burada gorunecektir.";
                consoleLogContainer.appendChild(ph);
            }
        });
    }
}
