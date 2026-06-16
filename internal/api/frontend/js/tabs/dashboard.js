import { state } from "../state.js";
import { $, $$, escapeHtml, isLightColor, showToast, logEntry } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

// Dynamic tab dependencies
import { updateFormInputsState } from "./orgs.js";
import { fetchSimulationDevices } from "./device-status.js";
import { connectLogStream } from "./console.js";

export function getDeterministicHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

export function getDeterministicCoords(seed, offsetScale) {
    const hash = getDeterministicHash(seed);
    let latCenter = 41.0082;
    let lngCenter = 28.9784;
    
    const activeOrg = state.organizations.find(o => o.id === state.activeOrgId);
    if (activeOrg && (activeOrg.name.toLowerCase().includes("raman") || activeOrg.name.toLowerCase().includes("batman"))) {
        latCenter = 37.8812;
        lngCenter = 41.1351;
    }
    
    const latOffset = ((hash & 0xFFFF) / 65535 - 0.5) * (offsetScale || 0.05);
    const lngOffset = (((hash >> 16) & 0xFFFF) / 65535 - 0.5) * (offsetScale || 0.05);
    
    return [latCenter + latOffset, lngCenter + lngOffset];
}

export function initMap() {
    const mapContainer = document.getElementById("simulation-map");
    if (!mapContainer || state.map) return;

    let latCenter = 41.0082;
    let lngCenter = 28.9784;
    
    const activeOrg = state.organizations.find(o => o.id === state.activeOrgId);
    if (activeOrg && (activeOrg.name.toLowerCase().includes("raman") || activeOrg.name.toLowerCase().includes("batman"))) {
        latCenter = 37.8812;
        lngCenter = 41.1351;
    }

    state.map = L.map('simulation-map').setView([latCenter, lngCenter], 12);

    const isLight = isLightColor(state.activeTheme ? state.activeTheme.bg : "#080a0f");
    const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    
    state.mapTileLayer = L.tileLayer(tileUrl, {
        attribution: attribution,
        maxZoom: 20
    }).addTo(state.map);
}

export function updateMapTileUrl() {
    if (!state.map || !state.mapTileLayer) return;
    const isLight = isLightColor(state.activeTheme ? state.activeTheme.bg : "#080a0f");
    const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    state.mapTileLayer.setUrl(tileUrl);
}

export function pulseDeviceMarkerAndLine(devEUI) {
    if (!state.map) return;
    
    const marker = state.mapMarkers.find(m => m.devEUI === devEUI);
    if (marker) {
        marker.setStyle({
            radius: 10,
            fillColor: '#f59e0b',
            fillOpacity: 1,
            color: '#f59e0b',
            weight: 2
        });
        setTimeout(() => {
            marker.setStyle({
                radius: 5,
                fillColor: '#10b981',
                fillOpacity: 0.9,
                color: '#ffffff',
                weight: 1.5
            });
        }, 800);
    }
    
    const line = state.mapLines.find(l => l.devEUI === devEUI);
    if (line) {
        line.setStyle({
            color: '#f59e0b',
            weight: 3,
            opacity: 0.9,
            dashArray: null
        });
        setTimeout(() => {
            line.setStyle({
                color: '#94a3b8',
                weight: 1,
                opacity: 0.5,
                dashArray: '3, 5'
            });
        }, 800);
    }
}

export function updateMap() {
    if (!state.map) {
        initMap();
    }
    if (!state.map) return;

    // Clear existing markers and lines
    state.mapMarkers.forEach(m => state.map.removeLayer(m));
    state.mapLines.forEach(l => state.map.removeLayer(l));
    state.mapMarkers = [];
    state.mapLines = [];

    let latCenter = 41.0082;
    let lngCenter = 28.9784;
    const activeOrg = state.organizations.find(o => o.id === state.activeOrgId);
    if (activeOrg && (activeOrg.name.toLowerCase().includes("raman") || activeOrg.name.toLowerCase().includes("batman"))) {
        latCenter = 37.8812;
        lngCenter = 41.1351;
    }

    const orgApps = (state.applications || []).filter(app => app.tenant_id === state.activeOrgId);

    let gwCount = 2;
    const activeConfig = state.activeOrgConfig;
    if (activeConfig && activeConfig.gateway_count !== undefined) {
        gwCount = activeConfig.gateway_count;
    }
    const hubCount = orgApps.length > 0 ? orgApps.length : gwCount;

    const gatewayCoordsList = [];
    for (let i = 0; i < hubCount; i++) {
        let gwName = "";
        let seed = "";
        if (orgApps.length > 0) {
            gwName = orgApps[i].name;
            seed = "app-gateway-" + orgApps[i].id;
        } else {
            gwName = "Gateway-" + (i + 1);
            seed = "gateway-" + state.activeOrgId + "-" + i;
        }
        const coords = getDeterministicCoords(seed, 0.15);
        gatewayCoordsList.push({
            coords: coords,
            name: gwName,
            appId: orgApps[i] ? orgApps[i].id : null
        });

        const gwMarker = L.circleMarker(coords, {
            radius: 10,
            fillColor: '#3b82f6', // blue
            fillOpacity: 0.8,
            color: '#ffffff',
            weight: 2
        }).addTo(state.map)
          .bindPopup(`<b>${orgApps.length > 0 ? "Ağ Hub: " : "Gateway: "}${escapeHtml(gwName)}</b><br>Coordinates: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
        
        state.mapMarkers.push(gwMarker);
    }

    const orgDevices = (state.allDevices || []).filter(d => !state.activeOrgId || d.tenant_id === state.activeOrgId);
    if (orgDevices.length > 0) {
        orgDevices.forEach((d) => {
            let gwIdx = -1;
            if (orgApps.length > 0) {
                gwIdx = orgApps.findIndex(app => app.id === d.application_id);
            }
            if (gwIdx === -1) {
                gwIdx = getDeterministicHash(d.dev_eui) % hubCount;
            }
            const gw = gatewayCoordsList[gwIdx];
            if (!gw) return;

            const hash = getDeterministicHash("device-" + d.dev_eui);
            const u = (hash & 0xFFFF) / 65535;
            const r = 4.0 * Math.sqrt(u); // 4 km radius
            const theta = (((hash >> 16) & 0xFFFF) / 65535) * 2 * Math.PI;

            const dx = r * Math.cos(theta);
            const dy = r * Math.sin(theta);

            const deltaLat = dy / 110.574;
            const deltaLng = dx / (111.320 * Math.cos(gw.coords[0] * Math.PI / 180));

            const devCoords = [
                gw.coords[0] + deltaLat,
                gw.coords[1] + deltaLng
            ];

            const devMarker = L.circleMarker(devCoords, {
                radius: 5,
                fillColor: '#10b981', // emerald green
                fillOpacity: 0.9,
                color: '#ffffff',
                weight: 1.5
            }).addTo(state.map)
              .bindPopup(`<b>Device: ${escapeHtml(d.name)}</b><br>DevEUI: ${escapeHtml(d.dev_eui)}<br>Gateway: ${escapeHtml(gw.name)}`);
            
            devMarker.devEUI = d.dev_eui;
            state.mapMarkers.push(devMarker);

            // Connect device with its gateway
            const line = L.polyline([devCoords, gw.coords], {
                color: '#94a3b8',
                weight: 1,
                opacity: 0.5,
                dashArray: '3, 5'
            }).addTo(state.map);
            line.devEUI = d.dev_eui;
            state.mapLines.push(line);
        });

        // Set view centered on gateway coords
        if (gatewayCoordsList.length > 0) {
            state.map.setView(gatewayCoordsList[0].coords, 12);
        }
    } else {
        state.map.setView([latCenter, lngCenter], 12);
    }
}

export function initChart() {
    const canvas = document.getElementById("metrics-chart");
    if (!canvas || state.metricsChart) return;

    const now = new Date();
    state.chartDataHistory.labels = [];
    state.chartDataHistory.uplinks = [];
    state.chartDataHistory.joinRequests = [];
    state.chartDataHistory.joinAccepts = [];
    
    for (let i = state.maxHistoryPoints - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 2000);
        state.chartDataHistory.labels.push(t.toLocaleTimeString());
        state.chartDataHistory.uplinks.push(0);
        state.chartDataHistory.joinRequests.push(0);
        state.chartDataHistory.joinAccepts.push(0);
    }

    const ctx = canvas.getContext('2d');
    state.metricsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.chartDataHistory.labels,
            datasets: [
                {
                    label: 'Uplink',
                    data: state.chartDataHistory.uplinks,
                    borderColor: '#10b981', // green
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Join Request',
                    data: state.chartDataHistory.joinRequests,
                    borderColor: '#f59e0b', // amber
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Join Accept',
                    data: state.chartDataHistory.joinAccepts,
                    borderColor: '#3b82f6', // blue
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'var(--text-dim)',
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'var(--text-dim)',
                        font: { size: 9 },
                        maxTicksLimit: 5
                    },
                    grid: {
                        color: 'var(--border-soft)'
                    }
                },
                y: {
                    ticks: {
                        color: 'var(--text-dim)',
                        font: { size: 9 },
                        precision: 0
                    },
                    grid: {
                        color: 'var(--border-soft)'
                    },
                    suggestedMax: 5
                }
            }
        }
    });
}

export function formatUptime(seconds) {
    if (seconds < 60) return seconds + "s";
    let m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return m + "m " + s + "s";
    const h = Math.floor(m / 60);
    m = m % 60;
    return h + "h " + m + "m";
}

export function setStatusBadge(status) {
    const statusBadge = $("#status-badge");
    const btnStart = $("#btn-start");
    const btnStop = $("#btn-stop");
    const btnTopStart = $("#btn-top-start");
    const btnTopStop = $("#btn-top-stop");
    const statSimStatus = $("#stat-sim-status");
    const bottomConsole = $("#bottom-console");

    state.currentStatus = status;
    if (statusBadge) {
        statusBadge.className = "badge badge-" + status;
        statusBadge.textContent = status.toUpperCase();
    }

    const isRunning = (status === "running" || status === "starting");
    if (btnStart) btnStart.disabled = isRunning || !state.activeOrgId;
    if (btnStop) btnStop.disabled  = !isRunning;
    if (btnTopStart) btnTopStart.disabled = isRunning || !state.activeOrgId;
    if (btnTopStop) btnTopStop.disabled  = !isRunning;
    updateFormInputsState();

    // Update console dot and expand when running
    const consoleDot = $(".console-dot");
    if (consoleDot) {
        if (isRunning) {
            consoleDot.classList.add("active");
            if (bottomConsole && bottomConsole.classList.contains("collapsed")) {
                bottomConsole.classList.remove("collapsed");
                bottomConsole.classList.add("expanded");
                const btnConsoleToggle = $("#btn-console-toggle");
                if (btnConsoleToggle) btnConsoleToggle.textContent = "Daralt";
                const savedHeight = localStorage.getItem("console-height") || "320px";
                bottomConsole.style.height = savedHeight;
            }
        } else {
            consoleDot.classList.remove("active");
        }
    }

    if (bottomConsole) {
        if (isRunning) {
            bottomConsole.classList.add("active-simulation");
        } else {
            bottomConsole.classList.remove("active-simulation");
        }
    }

    if (statSimStatus) statSimStatus.textContent = status.toUpperCase();
}

export async function checkHealth() {
    const connectionBadge = $("#connection-badge");
    const versionText = $("#version-text");
    const statServerStatus = $("#stat-server-status");
    const statServerVersion = $("#stat-server-version");

    const r = await api("GET", "/api/health");
    if (r.ok && r.data.status === "ok") {
        if (connectionBadge) {
            connectionBadge.className = "badge badge-online";
            connectionBadge.textContent = "Bağlı v" + (r.data.version || "?");
        }
        if (r.data.version && versionText) {
            versionText.textContent = r.data.version;
        }
        if (statServerStatus) statServerStatus.textContent = "ÇALIŞIYOR";
        if (statServerVersion) statServerVersion.textContent = r.data.version || "—";
    } else {
        if (connectionBadge) {
            connectionBadge.className = "badge badge-offline";
            connectionBadge.textContent = "Bağlantı Yok";
        }
        if (statServerStatus) statServerStatus.textContent = "ÇALIŞMIYOR";
    }
    return r.ok;
}

export async function pollStatus() {
    const uptimeBadge = $("#uptime-badge");
    const statUptime = $("#stat-uptime");
    const chartOrgSelect = $("#chart-org-select");

    let url = "/api/status";
    if (chartOrgSelect) {
        const val = chartOrgSelect.value || "all";
        if (val !== "all") {
            url += "?tenant_id=" + encodeURIComponent(val);
        }
    }
    const r = await api("GET", url);
    if (!r.ok) return;

    const data = r.data;
    setStatusBadge(data.status || "idle");

    if (data.uptime_seconds !== undefined && data.uptime_seconds !== null) {
        if (uptimeBadge) {
            uptimeBadge.style.display = "inline-flex";
            uptimeBadge.textContent = "⏱ " + formatUptime(data.uptime_seconds);
        }
        if (statUptime) statUptime.textContent = formatUptime(data.uptime_seconds);
    } else {
        if (uptimeBadge) uptimeBadge.style.display = "none";
    }

    if (data.status === "idle" && state.currentStatus !== "idle") {
        logEntry("Simulation finished.", "success");
    }
    if (data.status === "error") {
        logEntry("Simulation error occurred!", "error");
    }

    // Live Performance Chart Update
    if (data.metrics) {
        if (!state.metricsChart) {
            initChart();
        }

        if (state.metricsChart) {
            const currentMetrics = data.metrics;
            let uplinkDelta = 0;
            let joinReqDelta = 0;
            let joinAccDelta = 0;

            if (state.prevMetrics) {
                uplinkDelta = Math.max(0, currentMetrics.device_uplink_count - state.prevMetrics.device_uplink_count);
                joinReqDelta = Math.max(0, currentMetrics.device_join_request_count - state.prevMetrics.device_join_request_count);
                joinAccDelta = Math.max(0, currentMetrics.device_join_accept_count - state.prevMetrics.device_join_accept_count);
            }
            state.prevMetrics = currentMetrics;

            const timeStr = new Date().toLocaleTimeString();
            state.chartDataHistory.labels.push(timeStr);
            state.chartDataHistory.uplinks.push(uplinkDelta);
            state.chartDataHistory.joinRequests.push(joinReqDelta);
            state.chartDataHistory.joinAccepts.push(joinAccDelta);

            if (state.chartDataHistory.labels.length > state.maxHistoryPoints) {
                state.chartDataHistory.labels.shift();
                state.chartDataHistory.uplinks.shift();
                state.chartDataHistory.joinRequests.shift();
                state.chartDataHistory.joinAccepts.shift();
            }

            state.metricsChart.update();
        }
    }

    if (data.status === "running" || data.status === "starting") {
        fetchSimulationMetrics();
        if (state.currentTab === "device-status") {
            fetchSimulationDevices();
        }
    } else {
        resetSimulationMetrics();
        if (state.currentTab === "device-status") {
            state.devStatusList = [];
            fetchSimulationDevices();
        }
    }
}

export function startPolling() {
    stopPolling();
    pollStatus();
    state.pollTimer = setInterval(pollStatus, 2000);
}

export function stopPolling() {
    if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
}

export function collectConfig() {
    const formFields = [
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
        { id: "command_topic_template", key: "command_topic_template", type: "string" },
        { id: "packet_loss",            key: "packet_loss",            type: "float" },
        { id: "latency_ms",             key: "latency_ms",             type: "int" },
        { id: "payload_script",         key: "payload_script",         type: "string" }
    ];

    const cfg = {};
    for (let i = 0; i < formFields.length; i++) {
        const f = formFields[i];
        const el = document.getElementById(f.id);
        if (!el) continue;
        const val = el.value.trim();
        if (val === "") continue;
        if (f.type === "int") {
            cfg[f.key] = parseInt(val, 10);
        } else if (f.type === "float") {
            cfg[f.key] = parseFloat(val);
        } else {
            cfg[f.key] = val;
        }
    }
    return cfg;
}

export async function startSimulation() {
    try {
        if (!state.activeOrgId) {
            showToast("Lütfen bir organizasyon seçin!", "error");
            return;
        }

        const cfg = collectConfig();

        if (!cfg.tenant_id) {
            showToast("Tenant ID zorunludur!", "error");
            const tenantField = document.getElementById("tenant_id");
            if (tenantField) tenantField.focus();
            return;
        }

        const btnStart = $("#btn-start");
        const btnTopStart = $("#btn-top-start");
        if (btnStart) btnStart.disabled = true;
        if (btnTopStart) btnTopStart.disabled = true;
        logEntry("Simulation is starting...", "info");

        const r = await api("POST", "/api/start", cfg);

        if (r.ok) {
            logEntry("Start request sent.", "success");
            showToast("Simülasyon başlatılıyor...", "success");
            
            state.prevMetrics = null;
            if (state.metricsChart) {
                state.chartDataHistory.uplinks.fill(0);
                state.chartDataHistory.joinRequests.fill(0);
                state.chartDataHistory.joinAccepts.fill(0);
                state.metricsChart.update();
            }

            connectLogStream();
            startPolling();
        } else {
            const errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
            logEntry("Failed to start: " + errMsg, "error");
            showToast(errMsg, "error");
            if (btnStart) btnStart.disabled = false;
            if (btnTopStart) btnTopStart.disabled = false;
        }
    } catch (err) {
        console.error("startSimulation error:", err);
    }
}

export async function stopSimulation() {
    const btnStop = $("#btn-stop");
    const btnTopStop = $("#btn-top-stop");
    if (btnStop) btnStop.disabled = true;
    if (btnTopStop) btnTopStop.disabled = true;
    logEntry("Simulation is stopping...", "info");

    const r = await api("POST", "/api/stop");

    if (r.ok) {
        logEntry("Stop request sent.", "success");
        showToast("Simülasyon durduruluyor...", "success");
    } else {
        const errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to stop: " + errMsg, "error");
        showToast(errMsg, "error");
        if (btnStop) btnStop.disabled = false;
        if (btnTopStop) btnTopStop.disabled = false;
    }
}

export function populateChartOrgSelect() {
    const chartOrgSelect = $("#chart-org-select");
    if (!chartOrgSelect) return;
    const currentSelected = chartOrgSelect.value || "all";
    chartOrgSelect.innerHTML = "";
    
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = t("select_all_tenants");
    chartOrgSelect.appendChild(optAll);

    state.organizations.forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        chartOrgSelect.appendChild(opt);
    });

    const validOption = Array.from(chartOrgSelect.options).some(opt => opt.value === currentSelected);
    chartOrgSelect.value = validOption ? currentSelected : "all";
}

export async function fetchSimulationMetrics() {
    const r = await api("GET", "/api/simulation/metrics");
    if (r.ok && r.data) {
        const m = r.data;
        const upVal = m.device_uplink_count || 0;
        const reqVal = m.device_join_request_count || 0;
        const joinVal = m.device_join_accept_count || 0;
        const gwVal = m.gateway_uplink_count || 0;
        const downVal = m.gateway_downlink_count || 0;

        const elUp = document.getElementById("metric-uplinks");
        const elReq = document.getElementById("metric-join-reqs");
        const elJoin = document.getElementById("metric-joins");
        const elGw = document.getElementById("metric-gw-uplinks");
        const elDown = document.getElementById("metric-gw-downlinks");

        if (elUp) elUp.textContent = upVal;
        if (elReq) elReq.textContent = reqVal;
        if (elJoin) elJoin.textContent = joinVal;
        if (elGw) elGw.textContent = gwVal;
        if (elDown) elDown.textContent = downVal;
    }
}

export function resetSimulationMetrics() {
    const elUp = document.getElementById("metric-uplinks");
    const elReq = document.getElementById("metric-join-reqs");
    const elJoin = document.getElementById("metric-joins");
    const elGw = document.getElementById("metric-gw-uplinks");
    const elDown = document.getElementById("metric-gw-downlinks");

    if (elUp) elUp.textContent = "0";
    if (elReq) elReq.textContent = "0";
    if (elJoin) elJoin.textContent = "0";
    if (elGw) elGw.textContent = "0";
    if (elDown) elDown.textContent = "0";
}

export function initDashboard() {
    const btnStart = $("#btn-start");
    const btnStop = $("#btn-stop");
    const btnTopStart = $("#btn-top-start");
    const btnTopStop = $("#btn-top-stop");
    const mapOrgSelect = $("#map-org-select");
    const chartOrgSelect = $("#chart-org-select");

    if (btnStart) btnStart.addEventListener("click", startSimulation);
    if (btnStop) btnStop.addEventListener("click", stopSimulation);
    if (btnTopStart) btnTopStart.addEventListener("click", startSimulation);
    if (btnTopStop) btnTopStop.addEventListener("click", stopSimulation);

    if (mapOrgSelect) {
        mapOrgSelect.addEventListener("change", (e) => {
            state.activeOrgId = e.target.value;
            const activeOrg = state.organizations.find(o => o.id === e.target.value);
            if (activeOrg) {
                // Trigger loading config into form
                import("./orgs.js").then(module => {
                    module.loadOrgConfig(activeOrg.id, activeOrg.name);
                    module.updateFormInputsState();
                });
            }
        });
    }

    if (chartOrgSelect) {
        chartOrgSelect.addEventListener("change", () => {
            pollStatus();
        });
    }
}
