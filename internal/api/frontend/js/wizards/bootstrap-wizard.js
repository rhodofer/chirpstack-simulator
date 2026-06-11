import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry } from "../utils.js";
import { t } from "../translate.js";

// Tab imports will be resolved dynamically at runtime
import { fetchOrganizations, loadOrgConfig } from "../tabs/orgs.js";
import { fetchDeviceProfiles } from "../tabs/devices.js";
import { fetchApplications } from "../tabs/networks.js";
import { fetchDevices, fetchDeviceIntervals } from "../tabs/device-list.js";

let wizardCurrentStep = 1;

export function showBootstrapWizard() {
    wizardCurrentStep = 1;
    const wizOrgName = $("#wiz-org-name");
    const wizAppPrefix = $("#wiz-app-prefix");
    const wizAppCount = $("#wiz-app-count");
    const wizDpPrefix = $("#wiz-dp-prefix");
    const wizDpCount = $("#wiz-dp-count");
    const wizDevPrefix = $("#wiz-dev-prefix");
    const wizDevCount = $("#wiz-dev-count");
    const bootModalOverlay = $("#bootstrap-modal-overlay");
    const wizBtnNext = $("#wiz-btn-next");

    if (wizOrgName) wizOrgName.value = "";
    if (wizAppPrefix) wizAppPrefix.value = "ag";
    if (wizAppCount) wizAppCount.value = "5";
    if (wizDpPrefix) wizDpPrefix.value = "profile";
    if (wizDpCount) wizDpCount.value = "5";
    if (wizDevPrefix) wizDevPrefix.value = "device";
    if (wizDevCount) wizDevCount.value = "5";
    
    const scenarioSelect = $("#wiz-scenario-preset");
    if (scenarioSelect) scenarioSelect.value = "default";
    
    if (wizBtnNext) {
        wizBtnNext.disabled = false;
        wizBtnNext.textContent = t("btn_next");
    }
    renderBootstrapStep();
    if (bootModalOverlay) bootModalOverlay.style.display = "flex";
    setTimeout(() => { if (wizOrgName) wizOrgName.focus(); }, 100);
}

export function hideBootstrapWizard() {
    const bootModalOverlay = $("#bootstrap-modal-overlay");
    if (bootModalOverlay) bootModalOverlay.style.display = "none";
}

export function renderBootstrapStep() {
    const wizBtnPrev = $("#wiz-btn-prev");
    const wizBtnCancel = $("#wiz-btn-cancel");
    const wizBtnNext = $("#wiz-btn-next");
    const wizOrgName = $("#wiz-org-name");
    const wizAppPrefix = $("#wiz-app-prefix");
    const wizAppCount = $("#wiz-app-count");
    const wizDpPrefix = $("#wiz-dp-prefix");
    const wizDpCount = $("#wiz-dp-count");
    const wizDevPrefix = $("#wiz-dev-prefix");
    const wizDevCount = $("#wiz-dev-count");

    for (let i = 1; i <= 6; i++) {
        const pane = $("#wiz-pane-" + i);
        if (pane) pane.style.display = "none";
        
        const stepIndicator = $("#wiz-step-" + i);
        if (stepIndicator) {
            stepIndicator.classList.remove("active");
            stepIndicator.style.color = "var(--text-muted)";
        }
    }

    const currentPane = $("#wiz-pane-" + wizardCurrentStep);
    if (currentPane) currentPane.style.display = "block";
    
    const currentIndicator = $("#wiz-step-" + wizardCurrentStep);
    if (currentIndicator) {
        currentIndicator.classList.add("active");
        currentIndicator.style.color = "var(--accent)";
    }

    setTimeout(() => {
        if (wizardCurrentStep === 1) { if (wizOrgName) wizOrgName.focus(); }
        else if (wizardCurrentStep === 2) { if (wizAppPrefix) wizAppPrefix.focus(); }
        else if (wizardCurrentStep === 3) { if (wizDpPrefix) wizDpPrefix.focus(); }
        else if (wizardCurrentStep === 4) { if (wizDevPrefix) wizDevPrefix.focus(); }
    }, 100);

    if (wizBtnPrev) {
        if (wizardCurrentStep === 1 || wizardCurrentStep === 6) {
            wizBtnPrev.style.display = "none";
        } else {
            wizBtnPrev.style.display = "inline-block";
        }
    }

    if (wizardCurrentStep === 5) {
        // Populate Step 5 Summary
        const sumOrg = $("#wiz-summary-org");
        const sumApps = $("#wiz-summary-apps");
        const sumProfiles = $("#wiz-summary-profiles");

        if (sumOrg) sumOrg.textContent = wizOrgName ? wizOrgName.value.trim() : "";
        if (sumApps) sumApps.textContent = wizAppCount ? wizAppCount.value : "0";
        if (sumProfiles) sumProfiles.textContent = wizDpCount ? wizDpCount.value : "0";

        const slotsBody = $("#wiz-summary-slots-body");
        if (slotsBody) {
            slotsBody.innerHTML = "";
            const devCount = parseInt(wizDevCount ? wizDevCount.value : "0", 10) || 0;
            const dpCount = parseInt(wizDpCount ? wizDpCount.value : "0", 10) || 0;
            const devPref = wizDevPrefix ? wizDevPrefix.value.trim() || "device" : "device";
            const dpPref = wizDpPrefix ? wizDpPrefix.value.trim() || "profile" : "profile";
            const orgNameVal = wizOrgName ? wizOrgName.value.trim() : "";

            for (let sIdx = 1; sIdx <= devCount; sIdx++) {
                const tr = document.createElement("tr");
                
                // Profile dropdown options
                let dpOptionsHtml = "";
                for (let pIdx = 1; pIdx <= dpCount; pIdx++) {
                    const profileDisplayName = orgNameVal + "-" + dpPref + "-" + pIdx;
                    const isSelected = ((sIdx - 1) % dpCount === (pIdx - 1)) ? "selected" : "";
                    dpOptionsHtml += `<option value="${pIdx}" ${isSelected}>${escapeHtml(profileDisplayName)}</option>`;
                }

                // Interval dropdown options
                const intervalsList = [
                    { val: "1m", label: "1 dk" },
                    { val: "2m", label: "2 dk" },
                    { val: "4m", label: "4 dk" },
                    { val: "5m", label: "5 dk" },
                    { val: "10m", label: "10 dk" }
                ];
                let intOptionsHtml = "";
                for (let k = 0; k < intervalsList.length; k++) {
                    const isIntSelected = (intervalsList[k].val === "2m") ? "selected" : "";
                    intOptionsHtml += `<option value="${intervalsList[k].val}" ${isIntSelected}>${intervalsList[k].label}</option>`;
                }

                tr.innerHTML = 
                    `<td style="padding: 6px 8px;"><strong>${escapeHtml(devPref)}-${sIdx}</strong></td>` +
                    `<td style="padding: 6px 8px;">` +
                        `<select class="page-size-select wiz-slot-dp-select" style="max-width: 100%; font-size:11px;" data-slot="${sIdx}">` +
                            dpOptionsHtml +
                        `</select>` +
                    `</td>` +
                    `<td style="padding: 6px 8px;">` +
                        `<select class="page-size-select wiz-slot-int-select" style="max-width: 100%; font-size:11px;" data-slot="${sIdx}">` +
                            intOptionsHtml +
                        `</select>` +
                    `</td>`;

                slotsBody.appendChild(tr);
            }
        }

        if (wizBtnCancel) wizBtnCancel.style.display = "inline-block";
        if (wizBtnNext) {
            wizBtnNext.textContent = t("wiz_btn_confirm");
            wizBtnNext.disabled = false;
        }
    } else if (wizardCurrentStep === 6) {
        if (wizBtnCancel) wizBtnCancel.style.display = "none";
        if (wizBtnNext) {
            wizBtnNext.textContent = t("wiz_btn_close");
            wizBtnNext.disabled = false;
        }
    } else {
        if (wizBtnCancel) wizBtnCancel.style.display = "inline-block";
        if (wizBtnNext) {
            wizBtnNext.textContent = t("btn_next");
            wizBtnNext.disabled = false;
        }
    }
}

export function prevBootstrapStep() {
    if (wizardCurrentStep > 1) {
        wizardCurrentStep--;
        renderBootstrapStep();
    }
}

export async function nextBootstrapStep() {
    const wizOrgName = $("#wiz-org-name");
    const wizAppPrefix = $("#wiz-app-prefix");
    const wizAppCount = $("#wiz-app-count");
    const wizDpPrefix = $("#wiz-dp-prefix");
    const wizDpCount = $("#wiz-dp-count");
    const wizDevPrefix = $("#wiz-dev-prefix");
    const wizDevCount = $("#wiz-dev-count");

    if (wizardCurrentStep === 6) {
        hideBootstrapWizard();
        return;
    }
    if (wizardCurrentStep === 1) {
        const org = wizOrgName ? wizOrgName.value.trim() : "";
        if (!org) {
            showToast("Organizasyon adı zorunludur!", "error");
            if (wizOrgName) wizOrgName.focus();
            return;
        }
    } else if (wizardCurrentStep === 2) {
        const appPref = wizAppPrefix ? wizAppPrefix.value.trim() : "";
        const appCnt = parseInt(wizAppCount ? wizAppCount.value : "0", 10);
        if (!appPref) {
            showToast("Uygulama prefix'i zorunludur!", "error");
            if (wizAppPrefix) wizAppPrefix.focus();
            return;
        }
        if (isNaN(appCnt) || appCnt < 1 || appCnt > 50) {
            showToast("Geçerli bir ağ sayısı girin (1-50)!", "error");
            if (wizAppCount) wizAppCount.focus();
            return;
        }
    } else if (wizardCurrentStep === 3) {
        const dpPref = wizDpPrefix ? wizDpPrefix.value.trim() : "";
        const dpCnt = parseInt(wizDpCount ? wizDpCount.value : "0", 10);
        if (!dpPref) {
            showToast("Profil prefix'i zorunludur!", "error");
            if (wizDpPrefix) wizDpPrefix.focus();
            return;
        }
        if (isNaN(dpCnt) || dpCnt < 1 || dpCnt > 50) {
            showToast("Geçerli bir profil sayısı girin (1-50)!", "error");
            if (wizDpCount) wizDpCount.focus();
            return;
        }
    } else if (wizardCurrentStep === 4) {
        const devPref = wizDevPrefix ? wizDevPrefix.value.trim() : "";
        const devCnt = parseInt(wizDevCount ? wizDevCount.value : "0", 10);
        if (!devPref) {
            showToast("Cihaz prefix'i zorunludur!", "error");
            if (wizDevPrefix) wizDevPrefix.focus();
            return;
        }
        if (isNaN(devCnt) || devCnt < 1 || devCnt > 100) {
            showToast("Geçerli bir cihaz sayısı girin (1-100)!", "error");
            if (wizDevCount) wizDevCount.focus();
            return;
        }
    } else if (wizardCurrentStep === 5) {
        await submitBootstrap();
        return;
    }

    wizardCurrentStep++;
    renderBootstrapStep();
}

export async function submitBootstrap() {
    const wizOrgName = $("#wiz-org-name");
    const wizAppPrefix = $("#wiz-app-prefix");
    const wizAppCount = $("#wiz-app-count");
    const wizDpPrefix = $("#wiz-dp-prefix");
    const wizDpCount = $("#wiz-dp-count");
    const wizDevPrefix = $("#wiz-dev-prefix");
    const wizDevCount = $("#wiz-dev-count");
    const wizBtnNext = $("#wiz-btn-next");
    const scenarioSelect = $("#wiz-scenario-preset");

    const payload = {
        org_name: wizOrgName ? wizOrgName.value.trim() : "",
        app_prefix: wizAppPrefix ? wizAppPrefix.value.trim() : "",
        app_count: parseInt(wizAppCount ? wizAppCount.value : "0", 10),
        dp_prefix: wizDpPrefix ? wizDpPrefix.value.trim() : "",
        dp_count: parseInt(wizDpCount ? wizDpCount.value : "0", 10),
        dev_prefix: wizDevPrefix ? wizDevPrefix.value.trim() : "",
        dev_count: parseInt(wizDevCount ? wizDevCount.value : "0", 10),
        scenario: scenarioSelect ? scenarioSelect.value : "default"
    };

    const devicesConfig = [];
    const dpSelects = $$(".wiz-slot-dp-select");
    const intSelects = $$(".wiz-slot-int-select");

    for (let i = 0; i < dpSelects.length; i++) {
        const slotIdx = parseInt(dpSelects[i].getAttribute("data-slot"), 10);
        const profIdx = parseInt(dpSelects[i].value, 10);
        const intervalVal = intSelects[i].value;

        devicesConfig.push({
            device_index: slotIdx,
            profile_index: profIdx,
            interval: intervalVal
        });
    }
    payload.devices_config = devicesConfig;

    if (wizBtnNext) {
        wizBtnNext.disabled = true;
        wizBtnNext.textContent = t("wiz_btn_creating");
    }

    try {
        const res = await fetch("/api/bootstrap", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            // Populate success pane
            const orgEl = $("#wiz-success-org");
            const orgIdEl = $("#wiz-success-org-id");
            const devCountEl = $("#wiz-success-dev-count");
            
            if (orgEl) orgEl.textContent = data.tenant_name || "";
            if (orgIdEl) orgIdEl.textContent = data.tenant_id ? "ID: " + data.tenant_id : "";
            if (devCountEl) devCountEl.textContent = data.devices_count || "0";

            const appsList = $("#wiz-success-apps-list");
            if (appsList) {
                appsList.innerHTML = "";
                if (data.applications) {
                    data.applications.forEach((app) => {
                        const li = document.createElement("li");
                        li.innerHTML = escapeHtml(app.name) + ' <span style="font-size:11px; opacity:0.6;">(ID: ' + escapeHtml(app.id) + ')</span>';
                        appsList.appendChild(li);
                    });
                }
            }

            const profilesList = $("#wiz-success-profiles-list");
            if (profilesList) {
                profilesList.innerHTML = "";
                if (data.profiles) {
                    data.profiles.forEach((prof) => {
                        const li = document.createElement("li");
                        li.innerHTML = escapeHtml(prof.name) + ' <span style="font-size:11px; opacity:0.6;">(ID: ' + escapeHtml(prof.id) + ')</span>';
                        profilesList.appendChild(li);
                    });
                }
            }

            // Move to step 6 (success summary)
            wizardCurrentStep = 6;
            renderBootstrapStep();
            
            // Set the newly created organization as active
            state.activeOrgId = data.tenant_id;
            
            // Refresh list of organizations, device profiles, applications, devices and intervals
            await fetchOrganizations();
            await fetchDeviceProfiles("");
            await fetchApplications("");
            await fetchDevices("");
            await fetchDeviceIntervals();
            await loadOrgConfig(data.tenant_id, data.tenant_name);
        } else {
            showToast(data.error || "Kurulum başarısız oldu!", "error");
            if (wizBtnNext) {
                wizBtnNext.disabled = false;
                wizBtnNext.textContent = t("wiz_btn_confirm");
            }
        }
    } catch (err) {
        console.error(err);
        logEntry("Error in submitBootstrap: " + (err.stack || err.toString()), "error");
        showToast("Bağlantı hatası oluştu: " + err.toString(), "error");
        if (wizBtnNext) {
            wizBtnNext.disabled = false;
            wizBtnNext.textContent = t("wiz_btn_confirm");
        }
    }
}

export function initBootstrapWizard() {
    const btnTopBootstrap = $("#btn-top-bootstrap");
    const bootModalClose = $("#bootstrap-modal-close");
    const wizBtnCancel = $("#wiz-btn-cancel");
    const wizBtnPrev = $("#wiz-btn-prev");
    const wizBtnNext = $("#wiz-btn-next");
    const bootModalOverlay = $("#bootstrap-modal-overlay");
    const scenarioSelect = $("#wiz-scenario-preset");

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
        bootModalOverlay.addEventListener("click", (e) => {
            if (e.target === bootModalOverlay) hideBootstrapWizard();
        });
    }

    if (scenarioSelect) {
        scenarioSelect.addEventListener("change", () => {
            const wizOrgName = $("#wiz-org-name");
            if (wizOrgName) {
                if (scenarioSelect.value === "batman_oil") {
                    wizOrgName.value = "Raman-Petrol";
                } else {
                    wizOrgName.value = "";
                }
            }
        });
    }
}
