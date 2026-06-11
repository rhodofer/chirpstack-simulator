import { state } from "../state.js";
import { $, $$, showToast, logEntry } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { fetchOrganizations, saveOrgConfig } from "./orgs.js";
import { fetchDeviceProfiles } from "./devices.js";
import { fetchApplications } from "./networks.js";
import { fetchDevices } from "./device-list.js";

export async function fetchSystemConfig() {
    const r = await api("GET", "/api/config");
    if (r.ok) {
        const data = r.data;
        const apiServerInput = $("#conn-api-server");
        const apiKeyInput = $("#conn-api-key");
        const apiInsecureInput = $("#conn-api-insecure");
        const integrationMqttInput = $("#conn-integration-mqtt");
        const gatewayMqttInput = $("#conn-gateway-mqtt");

        if (apiServerInput) apiServerInput.value = data.api_server || "";
        if (apiKeyInput) apiKeyInput.value = data.api_key || "";
        if (apiInsecureInput) apiInsecureInput.checked = !!data.api_insecure;
        if (integrationMqttInput) integrationMqttInput.value = data.integration_mqtt_server || "";
        if (gatewayMqttInput) gatewayMqttInput.value = data.gateway_mqtt_server || "";
        
        logEntry("Connection settings loaded.", "success");
    } else {
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to load connection settings: " + err, "error");
    }
}

export async function saveSystemConfig(payload) {
    const r = await api("POST", "/api/config", payload);
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
        const err = (r.data && r.data.error) || "Bilinmeyen hata";
        showToast("Hata: " + err, "error");
        logEntry("Failed to update connection settings: " + err, "error");
        return false;
    }
}

export function initSettingsTab() {
    // 1. Settings Sub-Tabs switcher
    const tabButtons = $$(".settings-tab-btn");
    const subContents = $$(".settings-sub-content");
    
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            const targetTab = this.getAttribute("data-settings-tab");
            
            tabButtons.forEach((b) => {
                if (b === btn) {
                    b.classList.add("active");
                } else {
                    b.classList.remove("active");
                }
            });
            
            subContents.forEach((content) => {
                if (content.getAttribute("id") === "settings-sub-" + targetTab) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });
        });
    });

    // 2. JS example script copy buttons
    const copyButtons = $$(".btn-copy-script");
    copyButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            const targetId = this.getAttribute("data-target");
            const codeEl = document.getElementById(targetId);
            if (codeEl) {
                const codeText = codeEl.textContent || codeEl.innerText;
                const self = this;
                navigator.clipboard.writeText(codeText).then(() => {
                    const iconEl = self.querySelector("i");
                    const spanEl = self.querySelector("span");
                    
                    const originalIconClass = iconEl ? iconEl.className : "far fa-copy";
                    const isTr = state.language === "tr";
                    const copiedText = isTr ? "Kopyalandı!" : "Copied!";
                    
                    if (iconEl) iconEl.className = "fas fa-check";
                    if (spanEl) {
                        spanEl.removeAttribute("data-i18n");
                        spanEl.textContent = copiedText;
                    }
                    
                    self.style.borderColor = "#28a745";
                    self.style.color = "#28a745";
                    
                    setTimeout(() => {
                        if (iconEl) iconEl.className = originalIconClass;
                        if (spanEl) {
                            spanEl.setAttribute("data-i18n", "btn_copy");
                            spanEl.textContent = isTr ? "Kopyala" : "Copy";
                        }
                        self.style.borderColor = "";
                        self.style.color = "";
                    }, 1500);
                }).catch((err) => {
                    console.error("Clipboard copy failed:", err);
                });
            }
        });
    });

    // 3. Local storage field listeners for startup inputs
    const generalFieldIds = ["duration", "activation_time", "frequency", "bandwidth", "spreading_factor", "event_topic_template", "command_topic_template", "uplink_interval", "f_port", "payload", "packet_loss", "latency_ms", "payload_script"];
    generalFieldIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            // Load saved setting on startup
            const localVal = localStorage.getItem("setting-" + id);
            if (localVal !== null) {
                el.value = localVal;
            }
            // Save setting on change
            el.addEventListener("input", function () {
                localStorage.setItem("setting-" + id, this.value.trim());
            });
        }
    });

    // 4. Save General Settings button
    const btnSaveGeneralSettings = $("#btn-save-general-settings");
    if (btnSaveGeneralSettings) {
        btnSaveGeneralSettings.addEventListener("click", async (e) => {
            e.preventDefault();
            if (!state.activeOrgId) {
                showToast("Lütfen önce bir organizasyon seçin!", "error");
                return;
            }
            await saveOrgConfig(state.activeOrgId);
        });
    }

    // 5. Connections config form submit
    const connForm = $("#connections-form");
    if (connForm) {
        connForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = $("#btn-save-connections");
            if (!btn) return;
            const oldText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bağlanıyor...';

            const apiServer = $("#conn-api-server");
            const apiKey = $("#conn-api-key");
            const apiInsecure = $("#conn-api-insecure");
            const integrationMqtt = $("#conn-integration-mqtt");
            const gatewayMqtt = $("#conn-gateway-mqtt");

            const payload = {
                api_server: apiServer ? apiServer.value.trim() : "",
                api_key: apiKey ? apiKey.value.trim() : "",
                api_insecure: apiInsecure ? apiInsecure.checked : false,
                integration_mqtt_server: integrationMqtt ? integrationMqtt.value.trim() : "",
                gateway_mqtt_server: gatewayMqtt ? gatewayMqtt.value.trim() : ""
            };

            const ok = await saveSystemConfig(payload);
            
            btn.disabled = false;
            btn.innerHTML = oldText;
        });
    }
}
