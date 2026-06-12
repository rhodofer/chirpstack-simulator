import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry, openDrawer, closeDrawer } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

// Tab dependencies will be imported. Runtime handles circular dependency when function is called post-init.
import { updateMap, populateChartOrgSelect } from "./dashboard.js";
import { fetchDeviceProfiles, populateDpFilterTenantSelect } from "./devices.js";
import { fetchApplications, populateNetFilterTenantSelect } from "./networks.js";
import { fetchDevices, fetchDeviceIntervals, populateDevFilterTenantSelect } from "./device-list.js";

export function findOrg(id) {
    return state.organizations.find(o => o.id === id);
}

export function getOrgName(tenantId) {
    if (!tenantId) return "—";
    const org = findOrg(tenantId);
    return org ? org.name : tenantId;
}

export function validateDuration(str) {
    if (!str) return false;
    return /^\d+(ns|us|µs|ms|s|m|h)$/.test(str);
}

export function validateUplinkInterval(str) {
    if (!str) return false;
    const match = str.match(/^(\d+)(ns|us|µs|ms|s|m|h)$/);
    if (!match) return false;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === "ms" && val < 1000) return false;
    if (unit === "ns" || unit === "us" || unit === "µs") return false;
    if (val === 0) return false;
    return true;
}

export async function fetchOrganizations() {
    const r = await api("GET", "/api/organizations");
    if (r.ok && r.data.organizations) {
        state.organizations = r.data.organizations;
        populateMapOrgSelect();
        populateChartOrgSelect();
    } else {
        state.organizations = [];
        const errMsg = (r.data && r.data.error) || "Bağlantı hatası";
        logEntry("Failed to load organizations: " + errMsg, "error");
    }
    applyFiltersAndRender();
    populateDpFilterTenantSelect();
    populateNetFilterTenantSelect();
    populateDevFilterTenantSelect();
    await selectDefaultOrgIfNone();
}

export async function createOrganization(name, description) {
    const r = await api("POST", "/api/organizations", {
        name: name,
        description: description || ""
    });

    if (r.ok) {
        const org = r.data;
        logEntry("New organization created: " + org.name + " (ID: " + org.id + ")", "success");
        showToast("'" + org.name + "' organizasyonu oluşturuldu.", "success");
        await fetchOrganizations();
        openDrawer(org.name, t("drawer_subtitle_edit"), "edit");
        state.activeOrgId = org.id;
        await loadOrgConfig(org.id, org.name);
        return true;
    } else {
        const errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to create organization: " + errMsg, "error");
        showToast(errMsg, "error");
        return false;
    }
}

export async function deleteOrganization(id) {
    const org = findOrg(id);
    if (!org) return;
    if (!confirm("'" + org.name + "' organizasyonunu silmek istediğinize emin misiniz? (Bu işlem tüm bağlı ağları ve cihazları silecektir)")) return;
    const r = await api("DELETE", "/api/organizations/" + id);
    if (r.ok) {
        logEntry("Organization deleted: " + org.name, "success");
        showToast("'" + org.name + "' silindi.", "success");
        if (state.activeOrgId === id) {
            state.activeOrgId = null;
        }
        await fetchOrganizations();
    } else {
        const errMsg = (r.data && r.data.error) || "Silme hatası";
        logEntry("Failed to delete organization: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export async function saveOrgConfig(orgId) {
    if (!orgId) return;
    const tenantEl = document.getElementById("tenant_id");
    const appNameEl = document.getElementById("app_name");
    const devPrefixEl = document.getElementById("device_prefix");
    const devCountEl = document.getElementById("device_count");
    const gwCountEl = document.getElementById("gateway_count");

    const durationEl = document.getElementById("duration");
    const actTimeEl = document.getElementById("activation_time");
    const uplinkEl = document.getElementById("uplink_interval");
    const fPortEl = document.getElementById("f_port");
    const payloadEl = document.getElementById("payload");
    const freqEl = document.getElementById("frequency");
    const bwEl = document.getElementById("bandwidth");
    const sfEl = document.getElementById("spreading_factor");
    const eventEl = document.getElementById("event_topic_template");
    const cmdEl = document.getElementById("command_topic_template");

    const packetLossEl = document.getElementById("packet_loss");
    const simulatePacketLossEl = document.getElementById("simulate_packet_loss");
    const latencyMsEl = document.getElementById("latency_ms");
    const payloadScriptEl = document.getElementById("payload_script");
    const anomalyProbabilityEl = document.getElementById("anomaly_probability");
    const anomalyDurationEl = document.getElementById("anomaly_duration");
    const anomalyTypesCheckboxes = document.querySelectorAll(".anomaly-type-checkbox");
    const chosenTypes = [];
    anomalyTypesCheckboxes.forEach(cb => {
        if (cb.checked) chosenTypes.push(cb.value);
    });
    const anomalyTypesVal = chosenTypes.join(",");

    const uplinkIntervalVal = uplinkEl ? uplinkEl.value.trim() : "5m";
    const durationVal = durationEl ? durationEl.value.trim() : "5m";
    const activationTimeVal = actTimeEl ? actTimeEl.value.trim() : "1m";

    if (!validateUplinkInterval(uplinkIntervalVal)) {
        showToast("Uplink aralığı geçersiz veya 1 saniyeden az (örn: 5m, 10s)", "error");
        logEntry("Validation error: Uplink interval must be >= 1s (e.g., 5m, 30s)", "error");
        return;
    }
    if (durationVal && durationVal !== "0s" && !validateDuration(durationVal)) {
        showToast("Süre formatı geçersiz (örn: 5m, 1h)", "error");
        logEntry("Validation error: Invalid duration format", "error");
        return;
    }
    if (activationTimeVal && !validateDuration(activationTimeVal)) {
        showToast("Aktivasyon süresi formatı geçersiz (örn: 30s, 1m)", "error");
        logEntry("Validation error: Invalid activation time format", "error");
        return;
    }

    const orgNameEl = document.getElementById("org_name");
    const newOrgName = orgNameEl ? orgNameEl.value.trim() : "";
    const org = findOrg(orgId);

    if (org && newOrgName && org.name !== newOrgName) {
        const putResp = await api("PUT", "/api/organizations/" + orgId, {
            name: newOrgName,
            description: ""
        });
        if (putResp.ok) {
            org.name = newOrgName;
            logEntry("Organization name updated successfully to: " + newOrgName, "success");
            renderTable();
        } else {
            const putErr = (putResp.data && putResp.data.error) || "Organizasyon adı güncellenemedi";
            showToast("Organizasyon adı güncellenemedi: " + putErr, "error");
            logEntry("Failed to update organization name: " + putErr, "error");
            return;
        }
    }

    const data = {
        tenant_id: tenantEl ? tenantEl.value.trim() : orgId,
        app_name: appNameEl ? appNameEl.value.trim() : "",
        device_prefix: devPrefixEl ? devPrefixEl.value.trim() : "sim-dev",
        device_count: devCountEl ? parseInt(devCountEl.value, 10) : ((state.activeOrgConfig && state.activeOrgConfig.device_count) || 5),
        gateway_count: gwCountEl ? parseInt(gwCountEl.value, 10) : ((state.activeOrgConfig && state.activeOrgConfig.gateway_count) || 2),
        duration: durationVal,
        activation_time: activationTimeVal,
        uplink_interval: uplinkIntervalVal,
        f_port: parseInt(fPortEl ? fPortEl.value : "10", 10),
        payload: payloadEl ? payloadEl.value.trim() : "010203",
        frequency: parseInt(freqEl ? freqEl.value : "868100000", 10),
        bandwidth: parseInt(bwEl ? bwEl.value : "125000", 10),
        spreading_factor: parseInt(sfEl ? sfEl.value : "7", 10),
        event_topic_template: eventEl ? eventEl.value.trim() : "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
        command_topic_template: cmdEl ? cmdEl.value.trim() : "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}",
        packet_loss: parseFloat(packetLossEl ? packetLossEl.value : "0.0") || 0.0,
        simulate_packet_loss: simulatePacketLossEl ? simulatePacketLossEl.checked : false,
        latency_ms: parseInt(latencyMsEl ? latencyMsEl.value : "0", 10) || 0,
        payload_script: payloadScriptEl ? payloadScriptEl.value : "",
        anomaly_probability: anomalyProbabilityEl ? parseFloat(anomalyProbabilityEl.value) || 0.0 : 0.0,
        anomaly_duration: anomalyDurationEl ? parseInt(anomalyDurationEl.value, 10) || 5 : 5,
        anomaly_types: anomalyTypesVal
    };

    const btnSave = document.getElementById("btn-save-org-config");
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = "Kaydediliyor...";
    }

    const r = await api("POST", "/api/org-configs/" + orgId, data);
    
    if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "✓ Ayarları Kaydet";
    }

    if (r.ok) {
        logEntry("Settings saved successfully to server database (SQLite).", "success");
        showToast("Ayarlar başarıyla kaydedildi.", "success");
        state.activeOrgConfig = data;
        updateMap();
        closeDrawer();
    } else {
        const errMsg = (r.data && r.data.error) || "Kaydetme hatası";
        logEntry("Failed to save settings: " + errMsg, "error");
        showToast("Kaydetme hatası: " + errMsg, "error");
    }
}

export async function loadOrgConfig(orgId, orgName) {
    if (!orgId) return;

    const tenantField = document.getElementById("tenant_id");
    const appNameField = document.getElementById("app_name");
    const devPrefixField = document.getElementById("device_prefix");
    const devCountField = document.getElementById("device_count");
    const gwCountField = document.getElementById("gateway_count");

    const durationField = document.getElementById("duration");
    const actTimeField = document.getElementById("activation_time");
    const uplinkField = document.getElementById("uplink_interval");
    const fPortField = document.getElementById("f_port");
    const payloadField = document.getElementById("payload");
    const freqField = document.getElementById("frequency");
    const bwField = document.getElementById("bandwidth");
    const sfField = document.getElementById("spreading_factor");
    const eventField = document.getElementById("event_topic_template");
    const cmdField = document.getElementById("command_topic_template");

    const packetLossField = document.getElementById("packet_loss");
    const simulatePacketLossField = document.getElementById("simulate_packet_loss");
    const latencyMsField = document.getElementById("latency_ms");
    const payloadScriptField = document.getElementById("payload_script");
    const anomalyProbabilityField = document.getElementById("anomaly_probability");
    const anomalyDurationField = document.getElementById("anomaly_duration");

    const r = await api("GET", "/api/org-configs/" + orgId);
    if (r.ok && r.data && r.data.tenant_id) {
        const data = r.data;
        state.activeOrgConfig = data;
        if (tenantField) tenantField.value = data.tenant_id || orgId;
        if (appNameField) appNameField.value = data.app_name || orgName || "";
        if (devPrefixField) devPrefixField.value = data.device_prefix || "sim-dev";
        if (devCountField) devCountField.value = data.device_count || "5";
        if (gwCountField) gwCountField.value = data.gateway_count || "2";

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
        
        if (packetLossField) packetLossField.value = data.packet_loss !== undefined ? data.packet_loss : "0.0";
        if (simulatePacketLossField) {
            simulatePacketLossField.checked = data.simulate_packet_loss !== undefined ? !!data.simulate_packet_loss : false;
            if (packetLossField) packetLossField.disabled = !simulatePacketLossField.checked;
        }
        if (latencyMsField) latencyMsField.value = data.latency_ms !== undefined ? data.latency_ms : "0";
        if (payloadScriptField) payloadScriptField.value = data.payload_script || "";
        if (anomalyProbabilityField) anomalyProbabilityField.value = data.anomaly_probability !== undefined ? data.anomaly_probability : "0.0";
        if (anomalyDurationField) anomalyDurationField.value = data.anomaly_duration !== undefined ? data.anomaly_duration : "5";

        const types = (data.anomaly_types || "").split(",");
        const anomalyTypesCheckboxes = document.querySelectorAll(".anomaly-type-checkbox");
        anomalyTypesCheckboxes.forEach(cb => {
            cb.checked = types.includes(cb.value);
        });
        
        updateMap();
        return;
    }

    // Fallback/defaults if no saved config in SQLite
    if (tenantField) tenantField.value = orgId;
    if (appNameField) appNameField.value = orgName || "";
    if (devPrefixField) devPrefixField.value = "sim-dev";
    if (devCountField) devCountField.value = "5";
    if (gwCountField) gwCountField.value = "2";

    const fallbackData = {
        tenant_id: orgId,
        app_name: orgName || "",
        device_prefix: "sim-dev",
        device_count: 5,
        gateway_count: 2,
        duration: "5m",
        activation_time: "1m",
        uplink_interval: "5m",
        f_port: 10,
        payload: "010203",
        frequency: 868100000,
        bandwidth: 125000,
        spreading_factor: 7,
        event_topic_template: "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
        command_topic_template: "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}",
        packet_loss: 0.0,
        simulate_packet_loss: false,
        latency_ms: 0,
        payload_script: "",
        anomaly_probability: 0.0,
        anomaly_duration: 5,
        anomaly_types: ""
    };
    state.activeOrgConfig = fallbackData;

    const generalFields = ["duration", "activation_time", "frequency", "bandwidth", "spreading_factor", "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload", "packet_loss", "simulate_packet_loss", "latency_ms", "payload_script", "anomaly_probability", "anomaly_duration"];
    generalFields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            if (id === "simulate_packet_loss") {
                const localVal = localStorage.getItem("setting-" + id);
                el.checked = localVal !== null ? (localVal === "true") : el.defaultChecked || false;
                state.activeOrgConfig[id] = el.checked;
                
                const packetLossInput = document.getElementById("packet_loss");
                if (packetLossInput) {
                    packetLossInput.disabled = !el.checked;
                }
            } else {
                const localVal = localStorage.getItem("setting-" + id);
                el.value = localVal !== null ? localVal : el.defaultValue || "";
                
                const val = el.value.trim();
                if (id === "f_port" || id === "frequency" || id === "bandwidth" || id === "spreading_factor" || id === "latency_ms" || id === "anomaly_duration") {
                    state.activeOrgConfig[id] = parseInt(val, 10) || 0;
                } else if (id === "packet_loss" || id === "anomaly_probability") {
                    state.activeOrgConfig[id] = parseFloat(val) || 0.0;
                } else {
                    state.activeOrgConfig[id] = val;
                }
            }
        }
    });

    const anomalyTypesCheckboxes = document.querySelectorAll(".anomaly-type-checkbox");
    anomalyTypesCheckboxes.forEach(cb => {
        cb.checked = false;
    });
    updateMap();
}

export function updateFormInputsState() {
    const isSimRunning = (state.currentStatus === "running" || state.currentStatus === "starting");
    const isReadOnly = (state.drawerMode === "view" || isSimRunning);

    const drawerInputs = [
        "org_name", "tenant_id", "app_name", "device_prefix", "device_count", "gateway_count"
    ];
    drawerInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = isReadOnly;
    });

    const settingsInputs = [
        "duration", "activation_time", "frequency", "bandwidth", "spreading_factor",
        "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload",
        "packet_loss", "simulate_packet_loss", "latency_ms", "payload_script",
        "anomaly_probability", "anomaly_duration"
    ];
    settingsInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            if (id === "packet_loss") {
                const simChk = document.getElementById("simulate_packet_loss");
                el.disabled = isSimRunning || (simChk ? !simChk.checked : true);
            } else {
                el.disabled = isSimRunning;
            }
        }
    });

    const anomalyTypesCheckboxes = document.querySelectorAll(".anomaly-type-checkbox");
    anomalyTypesCheckboxes.forEach(cb => {
        cb.disabled = isSimRunning;
    });

    const btnSaveOrgConfig = $("#btn-save-org-config");
    if (btnSaveOrgConfig) {
        btnSaveOrgConfig.disabled = isSimRunning;
        if (state.drawerMode === "view") {
            btnSaveOrgConfig.style.display = "none";
        } else {
            btnSaveOrgConfig.style.display = "inline-flex";
        }
    }
    const btnSaveGeneralSettings = $("#btn-save-general-settings");
    if (btnSaveGeneralSettings) btnSaveGeneralSettings.disabled = isSimRunning;
}

export async function selectDefaultOrgIfNone() {
    const mapOrgSelect = $("#map-org-select");
    const btnTopStart = $("#btn-top-start");
    if (state.organizations.length > 0 && !state.activeOrgId) {
        const org = state.organizations[0];
        state.activeOrgId = org.id;
        if (mapOrgSelect) mapOrgSelect.value = org.id;
        await loadOrgConfig(org.id, org.name);
        updateFormInputsState();
        if (btnTopStart) btnTopStart.disabled = (state.currentStatus === "running" || state.currentStatus === "starting");
    }
}

export function populateMapOrgSelect() {
    const mapOrgSelect = $("#map-org-select");
    if (!mapOrgSelect) return;
    mapOrgSelect.innerHTML = "";
    
    if (state.organizations.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Organizasyon Yok";
        mapOrgSelect.appendChild(opt);
        return;
    }

    state.organizations.forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        mapOrgSelect.appendChild(opt);
    });

    if (state.activeOrgId) {
        mapOrgSelect.value = state.activeOrgId;
    }
}

export function applyFiltersAndRender() {
    const q = state.searchQuery.toLowerCase();
    if (q) {
        state.filteredOrgs = state.organizations.filter((org) => {
            return (org.name && org.name.toLowerCase().indexOf(q) !== -1) ||
                   (org.id && org.id.toLowerCase().indexOf(q) !== -1);
        });
    } else {
        state.filteredOrgs = state.organizations.slice();
    }

    // Sort
    const key = state.tableSort.key;
    const dir = state.tableSort.dir === "asc" ? 1 : -1;
    state.filteredOrgs.sort((a, b) => {
        let valA, valB;
        if (key === "app_count") {
            valA = state.applications.filter(app => app.tenant_id === a.id).length;
            valB = state.applications.filter(app => app.tenant_id === b.id).length;
            return (valA - valB) * dir;
        } else if (key === "dp_count") {
            valA = state.dpList.filter(dp => dp.tenant_id === a.id).length;
            valB = state.dpList.filter(dp => dp.tenant_id === b.id).length;
            return (valA - valB) * dir;
        } else if (key === "dev_count") {
            valA = state.devList.filter(dev => dev.tenant_id === a.id).length;
            valB = state.devList.filter(dev => dev.tenant_id === b.id).length;
            return (valA - valB) * dir;
        } else if (key === "date") {
            const dateValA = a.created_at || a.createdAt || a.created || 0;
            const dateValB = b.created_at || b.createdAt || b.created || 0;
            const dateA = new Date(dateValA);
            const dateB = new Date(dateValB);
            const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
            const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
            return (timeA - timeB) * dir;
        } else {
            valA = a[key] ? a[key].toString().toLowerCase() : "";
            valB = b[key] ? b[key].toString().toLowerCase() : "";
            return valA.localeCompare(valB) * dir;
        }
    });

    renderTable();
    renderPagination();
    renderTotalCount();
    updateSortIcons();
}

export function renderTable() {
    const orgTableBody = $("#org-table-body");
    const emptyState = $("#org-empty-state");
    if (!orgTableBody) return;
    orgTableBody.innerHTML = "";

    if (state.filteredOrgs.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }
    if (emptyState) emptyState.style.display = "none";

    const start = (state.tablePage - 1) * state.tablePageSize;
    const end = Math.min(start + state.tablePageSize, state.filteredOrgs.length);
    const pageItems = state.filteredOrgs.slice(start, end);

    for (let i = 0; i < pageItems.length; i++) {
        const org = pageItems[i];
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", org.id);
        if (org.id === state.activeOrgId) {
            tr.className = "selected";
        }

        const idShort = org.id.length > 20 ? org.id.substring(0, 20) + "…" : org.id;
        const isActive = true;

        const appCount = state.applications.filter(app => app.tenant_id === org.id).length;
        const dpCount = state.dpList.filter(dp => dp.tenant_id === org.id).length;
        const devCount = state.devList.filter(dev => dev.tenant_id === org.id).length;

        const dateVal = org.created_at || org.createdAt || org.created || new Date();
        const d = new Date(dateVal);
        const locale = state.language === "tr" ? "tr-TR" : "en-US";
        const formattedDate = isNaN(d.getTime()) ? new Date().toLocaleDateString(locale) : d.toLocaleDateString(locale);

        tr.innerHTML =
            `<td>` +
                `<div class="org-name-cell">` +
                    `<div class="org-status-dot ${isActive ? '' : 'inactive'}"></div>` +
                    `<div class="org-name-text">` +
                        `<span class="org-name-primary">${escapeHtml(org.name)}</span>` +
                        `<span class="org-name-secondary">Ana Organizasyon</span>` +
                    `</div>` +
                `</div>` +
            `</td>` +
            `<td><span class="status-pill active">AKTİF</span></td>` +
            `<td><span class="id-cell">${escapeHtml(idShort)}</span></td>` +
            `<td><span class="badge" style="background: rgba(0, 82, 255, 0.08); color: var(--blue); border: 1px solid rgba(0, 82, 255, 0.2);">${appCount} Ağ</span></td>` +
            `<td><span class="badge" style="background: rgba(240, 160, 64, 0.08); color: var(--accent); border: 1px solid rgba(240, 160, 64, 0.2);">${dpCount} Profil</span></td>` +
            `<td><span class="badge" style="background: rgba(0, 255, 135, 0.08); color: var(--green); border: 1px solid rgba(0, 255, 135, 0.2);">${devCount} Cihaz</span></td>` +
            `<td><span class="date-cell">${formattedDate}</span></td>` +
            `<td>` +
                `<div class="row-actions">` +
                    `<button class="row-action-btn view-btn" data-id="${org.id}" title="Görüntüle">👁</button>` +
                    `<button class="row-action-btn edit-btn" data-id="${org.id}" title="Düzenle">✏</button>` +
                    `<button class="row-action-btn danger delete-btn" data-id="${org.id}" title="Sil">🗑</button>` +
                `</div>` +
            `</td>`;

        tr.addEventListener("click", ((id) => {
            return (e) => {
                if (e.target.closest(".delete-btn")) {
                    e.stopPropagation();
                    deleteOrganization(id);
                    return;
                }
                if (e.target.closest(".edit-btn")) {
                    e.stopPropagation();
                    openOrgDrawer(id, "edit");
                    return;
                }
                if (e.target.closest(".view-btn")) {
                    e.stopPropagation();
                    openOrgDrawer(id, "view");
                    return;
                }
                openOrgDrawer(id, "view");
            };
        })(org.id));

        orgTableBody.appendChild(tr);
    }
}

export function openOrgDrawer(orgId, mode) {
    const org = findOrg(orgId);
    if (!org) return;

    state.activeOrgId = orgId;
    const mapOrgSelect = $("#map-org-select");
    if (mapOrgSelect) mapOrgSelect.value = orgId;
    
    openDrawer(org.name || "Organizasyon", mode === "view" ? t("drawer_subtitle_view") : t("drawer_subtitle_edit"), mode);
    
    const orgNameEl = document.getElementById("org_name");
    if (orgNameEl) orgNameEl.value = org.name || "";

    loadOrgConfig(orgId, org.name);
    updateFormInputsState();

    logEntry("Organization selected: " + org.name, "info");
    renderTable();
}

export function renderPagination() {
    const paginationEl = $("#org-pagination");
    if (!paginationEl) return;
    paginationEl.innerHTML = "";
    const total = state.filteredOrgs.length;
    const totalPages = Math.max(1, Math.ceil(total / state.tablePageSize));
    const current = state.tablePage;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = t("prev_page") || "Geri";
    prevBtn.disabled = (current <= 1);
    prevBtn.addEventListener("click", () => { goToPage(current - 1); });
    paginationEl.appendChild(prevBtn);

    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (p === current ? " active" : "");
        pageBtn.textContent = p;
        pageBtn.addEventListener("click", ((pageNum) => {
            return () => { goToPage(pageNum); };
        })(p));
        paginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = t("next_page") || "İleri";
    nextBtn.disabled = (current >= totalPages);
    nextBtn.addEventListener("click", () => { goToPage(current + 1); });
    paginationEl.appendChild(nextBtn);
}

export function renderTotalCount() {
    const totalCountEl = $("#org-total-count");
    if (!totalCountEl) return;
    const total = state.filteredOrgs.length;
    totalCountEl.innerHTML = t("footer_total_org").replace("{count}", total);
}

export function updateSortIcons() {
    const allIcons = $$(".sort-icon");
    for (let i = 0; i < allIcons.length; i++) {
        allIcons[i].classList.remove("active");
        allIcons[i].textContent = "▲";
    }

    const key = state.tableSort.key;
    const dir = state.tableSort.dir;
    const icon = $(`#sort-icon-${key}`);
    if (icon) {
        icon.classList.add("active");
        icon.textContent = dir === "asc" ? "▲" : "▼";
    }
}

export function sortBy(key) {
    if (state.tableSort.key === key) {
        state.tableSort.dir = state.tableSort.dir === "asc" ? "desc" : "asc";
    } else {
        state.tableSort.key = key;
        state.tableSort.dir = "asc";
    }
    state.tablePage = 1;
    applyFiltersAndRender();
}

export function searchOrgs(q) {
    state.searchQuery = q;
    state.tablePage = 1;
    applyFiltersAndRender();
}

export function changePageSize(n) {
    state.tablePageSize = parseInt(n, 10) || 5;
    state.tablePage = 1;
    applyFiltersAndRender();
}

export function goToPage(n) {
    const totalPages = Math.max(1, Math.ceil(state.filteredOrgs.length / state.tablePageSize));
    if (n < 1 || n > totalPages) return;
    state.tablePage = n;
    applyFiltersAndRender();
}

export function initOrgsTab() {
    const simulatePacketLossEl = $("#simulate_packet_loss");
    const packetLossEl = $("#packet_loss");
    if (simulatePacketLossEl && packetLossEl) {
        simulatePacketLossEl.addEventListener("change", () => {
            packetLossEl.disabled = !simulatePacketLossEl.checked;
        });
    }

    const btnAddOrg = $("#btn-add-org");
    const modalOverlay = $("#modal-overlay");
    const modalClose = $("#modal-close");
    const modalCancel = $("#modal-cancel");
    const orgModalForm = $("#org-modal-form");
    const drawerClose = $("#drawer-close");
    const btnSaveOrgConfig = $("#btn-save-org-config");

    const searchInput = $("#org-search-input");
    const pageSizeSelect = $("#org-page-size-select");
    const btnRefresh = $("#btn-org-refresh");

    if (btnAddOrg) {
        btnAddOrg.addEventListener("click", () => {
            const orgName = $("#org-name");
            const orgDescription = $("#org-description");
            if (orgName) orgName.value = "";
            if (orgDescription) orgDescription.value = "";
            if (modalOverlay) modalOverlay.style.display = "flex";
            setTimeout(() => { if (orgName) orgName.focus(); }, 100);
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

    if (orgModalForm) {
        orgModalForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const orgName = $("#org-name");
            const orgDescription = $("#org-description");
            const name = orgName ? orgName.value.trim() : "";
            const desc = orgDescription ? orgDescription.value.trim() : "";
            if (!name) return;
            const ok = await createOrganization(name, desc);
            if (ok) hideAddModal();
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener("click", closeDrawer);
    }

    if (btnSaveOrgConfig) {
        btnSaveOrgConfig.addEventListener("click", (e) => {
            e.preventDefault();
            saveOrgConfig(state.activeOrgId);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchOrgs(e.target.value);
        });
    }

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", (e) => {
            changePageSize(e.target.value);
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            fetchOrganizations();
        });
    }

    // Sort headers
    $$("#content-overview thead th.sortable").forEach((th) => {
        th.addEventListener("click", () => {
            sortBy(th.getAttribute("data-sort"));
        });
    });
}
