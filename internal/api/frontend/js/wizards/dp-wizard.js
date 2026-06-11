import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { fetchDeviceProfiles } from "../tabs/devices.js";

let dpWizCurrentStep = 1;

export function populateDpTenantSelect() {
    const dpTenant = $("#dp-tenant");
    if (!dpTenant) return;
    dpTenant.innerHTML = "";
    if (state.organizations.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Önce organizasyon oluşturun";
        opt.disabled = true;
        dpTenant.appendChild(opt);
        return;
    }
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Lütfen seçiniz...";
    dpTenant.appendChild(defaultOpt);

    for (let i = 0; i < state.organizations.length; i++) {
        const opt = document.createElement("option");
        opt.value = state.organizations[i].id;
        opt.textContent = state.organizations[i].name;
        dpTenant.appendChild(opt);
    }
}

export function showDpModal() {
    const dpName = $("#dp-name");
    const dpDescription = $("#dp-description");
    const dpRegion = $("#dp-region");
    const dpMacVersion = $("#dp-mac-version");
    const dpRegParams = $("#dp-reg-params");
    const dpAdrAlg = $("#dp-adr-alg");
    const dpSupportsOtaa = $("#dp-supports-otaa");
    const dpSupportsClassB = $("#dp-supports-class-b");
    const dpSupportsClassC = $("#dp-supports-class-c");
    const dpModalOverlay = $("#dp-modal-overlay");

    if (dpName) dpName.value = "";
    if (dpDescription) dpDescription.value = "";
    if (dpRegion) dpRegion.value = "EU868";
    if (dpMacVersion) dpMacVersion.value = "LORAWAN_1_0_3";
    if (dpRegParams) dpRegParams.value = "B";
    if (dpAdrAlg) dpAdrAlg.value = "default";
    if (dpSupportsOtaa) dpSupportsOtaa.checked = true;
    if (dpSupportsClassB) dpSupportsClassB.checked = false;
    if (dpSupportsClassC) dpSupportsClassC.checked = false;
    
    populateDpTenantSelect();
    dpWizCurrentStep = 1;
    renderDpWizStep();
    if (dpModalOverlay) dpModalOverlay.style.display = "flex";
    setTimeout(() => { if (dpName) dpName.focus(); }, 100);
}

export function hideDpModal() {
    const dpModalOverlay = $("#dp-modal-overlay");
    if (dpModalOverlay) dpModalOverlay.style.display = "none";
}

export function renderDpWizStep() {
    const dpWizBtnPrev = $("#dp-wiz-btn-prev");
    const dpWizBtnNext = $("#dp-wiz-btn-next");
    const dpSummaryOrgName = $("#dp-summary-org-name");
    const dpSummaryName = $("#dp-summary-name");
    const dpSummaryRegionMac = $("#dp-summary-region-mac");
    const dpSummaryActivation = $("#dp-summary-activation");
    const dpSummaryClasses = $("#dp-summary-classes");
    
    const dpTenant = $("#dp-tenant");
    const dpName = $("#dp-name");
    const dpRegion = $("#dp-region");
    const dpMacVersion = $("#dp-mac-version");
    const dpSupportsOtaa = $("#dp-supports-otaa");
    const dpSupportsClassB = $("#dp-supports-class-b");
    const dpSupportsClassC = $("#dp-supports-class-c");

    for (let i = 1; i <= 3; i++) {
        const pane = $("#dp-wiz-pane-" + i);
        if (pane) pane.style.display = (i === dpWizCurrentStep) ? "block" : "none";
        
        const stepIndicator = $("#dp-wiz-step-" + i);
        if (stepIndicator) {
            if (i === dpWizCurrentStep) {
                stepIndicator.classList.add("active");
                stepIndicator.style.color = "var(--accent)";
            } else {
                stepIndicator.classList.remove("active");
                stepIndicator.style.color = "";
            }
        }
    }

    if (dpWizBtnPrev) {
        dpWizBtnPrev.style.display = (dpWizCurrentStep === 1) ? "none" : "inline-block";
    }

    if (dpWizBtnNext) {
        dpWizBtnNext.textContent = (dpWizCurrentStep === 3) ? "Onayla ve Oluştur" : "İleri";
    }

    if (dpWizCurrentStep === 3) {
        if (dpSummaryOrgName) dpSummaryOrgName.textContent = dpTenant ? dpTenant.options[dpTenant.selectedIndex].text : "";
        if (dpSummaryName) dpSummaryName.textContent = dpName ? dpName.value.trim() : "";
        if (dpSummaryRegionMac) dpSummaryRegionMac.textContent = (dpRegion ? dpRegion.value : "") + " / " + (dpMacVersion ? dpMacVersion.value : "");
        if (dpSummaryActivation) dpSummaryActivation.textContent = (dpSupportsOtaa && dpSupportsOtaa.checked) ? "OTAA" : "ABP";
        
        const classes = ["Class A"];
        if (dpSupportsClassB && dpSupportsClassB.checked) classes.push("Class B");
        if (dpSupportsClassC && dpSupportsClassC.checked) classes.push("Class C");
        if (dpSummaryClasses) dpSummaryClasses.textContent = classes.join(", ");
    }

    checkDpWizValidation();
}

export function checkDpWizValidation() {
    const dpWizBtnNext = $("#dp-wiz-btn-next");
    const dpTenant = $("#dp-tenant");
    const dpName = $("#dp-name");
    
    if (!dpWizBtnNext) return;
    if (dpWizCurrentStep === 1) {
        const hasTenant = dpTenant && dpTenant.value !== "";
        const hasName = dpName && dpName.value.trim() !== "";
        dpWizBtnNext.disabled = !(hasTenant && hasName);
    } else {
        dpWizBtnNext.disabled = false;
    }
}

export function prevDpWizStep() {
    if (dpWizCurrentStep > 1) {
        dpWizCurrentStep--;
        renderDpWizStep();
    }
}

export function nextDpWizStep() {
    if (dpWizCurrentStep === 3) {
        submitDpWiz();
    } else {
        dpWizCurrentStep++;
        renderDpWizStep();
    }
}

export async function createDeviceProfile(data) {
    const r = await api("POST", "/api/device-profiles", data);
    if (r.ok) {
        const dp = r.data;
        logEntry("New device profile created: " + dp.name + " (ID: " + dp.id + ")", "success");
        showToast("'" + dp.name + "' profili oluşturuldu.", "success");
        await fetchDeviceProfiles(state.dpTenantFilter);
        return true;
    } else {
        const errMsg = (r.data && r.data.error) || "Bilinmeyen hata";
        logEntry("Failed to create device profile: " + errMsg, "error");
        showToast(errMsg, "error");
        return false;
    }
}

export async function submitDpWiz() {
    const dpName = $("#dp-name");
    const dpTenant = $("#dp-tenant");
    const dpDescription = $("#dp-description");
    const dpRegion = $("#dp-region");
    const dpMacVersion = $("#dp-mac-version");
    const dpRegParams = $("#dp-reg-params");
    const dpAdrAlg = $("#dp-adr-alg");
    const dpSupportsOtaa = $("#dp-supports-otaa");
    const dpSupportsClassB = $("#dp-supports-class-b");
    const dpSupportsClassC = $("#dp-supports-class-c");
    const dpWizBtnNext = $("#dp-wiz-btn-next");

    const name = dpName.value.trim();
    const tenantId = dpTenant.value;
    if (!name || !tenantId) return;

    if (dpWizBtnNext) {
        dpWizBtnNext.disabled = true;
        dpWizBtnNext.textContent = "Oluşturuluyor...";
    }

    const data = {
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

    const ok = await createDeviceProfile(data);
    if (dpWizBtnNext) {
        dpWizBtnNext.disabled = false;
        dpWizBtnNext.textContent = "Onayla ve Oluştur";
    }
    if (ok) hideDpModal();
}

export function initDpWizard() {
    const btnAddDp = $("#btn-add-dp");
    const dpModalClose = $("#dp-modal-close");
    const dpModalCancel = $("#dp-modal-cancel");
    const dpWizBtnPrev = $("#dp-wiz-btn-prev");
    const dpWizBtnNext = $("#dp-wiz-btn-next");
    const dpTenant = $("#dp-tenant");
    const dpName = $("#dp-name");
    const dpModalOverlay = $("#dp-modal-overlay");

    if (btnAddDp) {
        btnAddDp.addEventListener("click", showDpModal);
    }
    if (dpModalClose) {
        dpModalClose.addEventListener("click", hideDpModal);
    }
    if (dpModalCancel) {
        dpModalCancel.addEventListener("click", hideDpModal);
    }
    if (dpWizBtnPrev) {
        dpWizBtnPrev.addEventListener("click", prevDpWizStep);
    }
    if (dpWizBtnNext) {
        dpWizBtnNext.addEventListener("click", nextDpWizStep);
    }
    if (dpTenant) {
        dpTenant.addEventListener("change", checkDpWizValidation);
    }
    if (dpName) {
        dpName.addEventListener("input", checkDpWizValidation);
    }
    if (dpModalOverlay) {
        dpModalOverlay.addEventListener("click", (e) => {
            if (e.target === dpModalOverlay) hideDpModal();
        });
    }
}
