import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry } from "../utils.js";
import { t } from "../translate.js";
import { createDevice, generateRandomDevEUI } from "../tabs/device-list.js";

let devWizCurrentStep = 1;

export function populateDevWizTenantSelect() {
    const devWizTenant = $("#dev-wiz-tenant");
    if (!devWizTenant) return;
    devWizTenant.innerHTML = "";
    if (state.organizations.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Önce organizasyon oluşturun" : "Create an organization first";
        opt.disabled = true;
        devWizTenant.appendChild(opt);
        return;
    }
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = state.language === "tr" ? "Lütfen seçiniz..." : "Please select...";
    devWizTenant.appendChild(defaultOpt);

    for (let i = 0; i < state.organizations.length; i++) {
        const opt = document.createElement("option");
        opt.value = state.organizations[i].id;
        opt.textContent = state.organizations[i].name;
        devWizTenant.appendChild(opt);
    }
}

export function onDevWizTenantChange() {
    const devWizTenant = $("#dev-wiz-tenant");
    const devWizApp = $("#dev-wiz-app");
    const devWizProfile = $("#dev-wiz-profile");
    if (!devWizTenant || !devWizApp || !devWizProfile) return;

    const tenantId = devWizTenant.value;
    devWizApp.innerHTML = "";
    devWizProfile.innerHTML = "";

    if (!tenantId) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Önce organizasyon seçin" : "Select organization first";
        opt.disabled = true;
        devWizApp.appendChild(opt.cloneNode(true));
        devWizProfile.appendChild(opt);
        return;
    }

    // Filter applications by tenant
    const filteredApps = state.applications.filter(app => app.tenant_id === tenantId);
    if (filteredApps.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Bu organizasyon için ağ yok" : "No networks for this organization";
        opt.disabled = true;
        devWizApp.appendChild(opt);
    } else {
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = state.language === "tr" ? "Lütfen seçiniz..." : "Please select...";
        devWizApp.appendChild(defaultOpt);

        filteredApps.forEach(app => {
            const opt = document.createElement("option");
            opt.value = app.id;
            opt.textContent = app.name;
            devWizApp.appendChild(opt);
        });
    }

    // Filter device profiles by tenant
    const filteredDps = state.dpList.filter(dp => dp.tenant_id === tenantId);
    if (filteredDps.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = state.language === "tr" ? "Bu organizasyon için cihaz profili yok" : "No device profiles for this organization";
        opt.disabled = true;
        devWizProfile.appendChild(opt);
    } else {
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = state.language === "tr" ? "Lütfen seçiniz..." : "Please select...";
        devWizProfile.appendChild(defaultOpt);

        filteredDps.forEach(dp => {
            const opt = document.createElement("option");
            opt.value = dp.id;
            opt.textContent = dp.name;
            devWizProfile.appendChild(opt);
        });
    }

    checkDevWizValidation();
}

export function showDevWizModal() {
    const devWizEui = $("#dev-wiz-eui");
    const devWizName = $("#dev-wiz-name");
    const devWizDesc = $("#dev-wiz-desc");
    const devModalOverlay = $("#dev-modal-overlay");

    if (devWizEui) devWizEui.value = "";
    if (devWizName) devWizName.value = "";
    if (devWizDesc) devWizDesc.value = "";

    populateDevWizTenantSelect();
    onDevWizTenantChange();

    devWizCurrentStep = 1;
    renderDevWizStep();
    if (devModalOverlay) devModalOverlay.style.display = "flex";
    setTimeout(() => {
        const devWizTenant = $("#dev-wiz-tenant");
        if (devWizTenant) devWizTenant.focus();
    }, 100);
}

export function hideDevWizModal() {
    const devModalOverlay = $("#dev-modal-overlay");
    if (devModalOverlay) devModalOverlay.style.display = "none";
}

export function renderDevWizStep() {
    const devWizBtnPrev = $("#dev-wiz-btn-prev");
    const devWizBtnNext = $("#dev-wiz-btn-next");

    const devWizTenant = $("#dev-wiz-tenant");
    const devWizApp = $("#dev-wiz-app");
    const devWizEui = $("#dev-wiz-eui");
    const devWizName = $("#dev-wiz-name");
    const devWizProfile = $("#dev-wiz-profile");
    const devWizDesc = $("#dev-wiz-desc");

    const devWizSummaryTenant = $("#dev-wiz-summary-tenant");
    const devWizSummaryApp = $("#dev-wiz-summary-app");
    const devWizSummaryEui = $("#dev-wiz-summary-eui");
    const devWizSummaryName = $("#dev-wiz-summary-name");
    const devWizSummaryProfile = $("#dev-wiz-summary-profile");
    const devWizSummaryDesc = $("#dev-wiz-summary-desc");

    for (let i = 1; i <= 3; i++) {
        const pane = $("#dev-wiz-pane-" + i);
        if (pane) pane.style.display = (i === devWizCurrentStep) ? "block" : "none";

        const stepIndicator = $("#dev-wiz-step-" + i);
        if (stepIndicator) {
            if (i === devWizCurrentStep) {
                stepIndicator.classList.add("active");
                stepIndicator.style.color = "var(--accent)";
            } else {
                stepIndicator.classList.remove("active");
                stepIndicator.style.color = "";
            }
        }
    }

    if (devWizBtnPrev) {
        devWizBtnPrev.style.display = (devWizCurrentStep === 1) ? "none" : "inline-block";
    }

    if (devWizBtnNext) {
        devWizBtnNext.textContent = (devWizCurrentStep === 3) 
            ? (state.language === "tr" ? "Onayla ve Oluştur" : "Confirm & Create")
            : (state.language === "tr" ? "İleri" : "Next");
    }

    if (devWizCurrentStep === 3) {
        if (devWizSummaryTenant) devWizSummaryTenant.textContent = devWizTenant && devWizTenant.selectedIndex >= 0 ? devWizTenant.options[devWizTenant.selectedIndex].text : "";
        if (devWizSummaryApp) devWizSummaryApp.textContent = devWizApp && devWizApp.selectedIndex >= 0 ? devWizApp.options[devWizApp.selectedIndex].text : "";
        if (devWizSummaryEui) devWizSummaryEui.textContent = devWizEui ? devWizEui.value.trim() : "";
        if (devWizSummaryName) devWizSummaryName.textContent = devWizName ? devWizName.value.trim() : "";
        if (devWizSummaryProfile) devWizSummaryProfile.textContent = devWizProfile && devWizProfile.selectedIndex >= 0 ? devWizProfile.options[devWizProfile.selectedIndex].text : "";
        if (devWizSummaryDesc) devWizSummaryDesc.textContent = devWizDesc ? devWizDesc.value.trim() || "—" : "—";
    }

    checkDevWizValidation();
}

export function checkDevWizValidation() {
    const devWizBtnNext = $("#dev-wiz-btn-next");
    const devWizTenant = $("#dev-wiz-tenant");
    const devWizApp = $("#dev-wiz-app");
    const devWizEui = $("#dev-wiz-eui");
    const devWizName = $("#dev-wiz-name");
    const devWizProfile = $("#dev-wiz-profile");

    if (!devWizBtnNext) return;

    if (devWizCurrentStep === 1) {
        const hasTenant = devWizTenant && devWizTenant.value !== "";
        const hasApp = devWizApp && devWizApp.value !== "";
        devWizBtnNext.disabled = !(hasTenant && hasApp);
    } else if (devWizCurrentStep === 2) {
        const eui = devWizEui ? devWizEui.value.trim() : "";
        const hasEui = eui.length === 16;
        const hasName = devWizName && devWizName.value.trim() !== "";
        const hasProfile = devWizProfile && devWizProfile.value !== "";
        devWizBtnNext.disabled = !(hasEui && hasName && hasProfile);
    } else {
        devWizBtnNext.disabled = false;
    }
}

export function prevDevWizStep() {
    if (devWizCurrentStep > 1) {
        devWizCurrentStep--;
        renderDevWizStep();
    }
}

export function nextDevWizStep() {
    if (devWizCurrentStep === 3) {
        submitDevWiz();
    } else {
        devWizCurrentStep++;
        renderDevWizStep();
    }
}

export async function submitDevWiz() {
    const devWizEui = $("#dev-wiz-eui");
    const devWizName = $("#dev-wiz-name");
    const devWizApp = $("#dev-wiz-app");
    const devWizProfile = $("#dev-wiz-profile");
    const devWizDesc = $("#dev-wiz-desc");
    const devWizBtnNext = $("#dev-wiz-btn-next");

    const eui = devWizEui.value.trim();
    const name = devWizName.value.trim();
    const appId = devWizApp.value;
    const dpId = devWizProfile.value;
    const description = devWizDesc.value.trim();

    if (!eui || !name || !appId || !dpId) return;

    if (devWizBtnNext) {
        devWizBtnNext.disabled = true;
        devWizBtnNext.textContent = state.language === "tr" ? "Oluşturuluyor..." : "Creating...";
    }

    const ok = await createDevice({
        dev_eui: eui,
        name: name,
        application_id: appId,
        device_profile_id: dpId,
        description: description
    });

    if (devWizBtnNext) {
        devWizBtnNext.disabled = false;
        devWizBtnNext.textContent = state.language === "tr" ? "Onayla ve Oluştur" : "Confirm & Create";
    }

    if (ok) hideDevWizModal();
}

export function initDevWizard() {
    const btnAddDev = $("#btn-add-dev");
    const devModalClose = $("#dev-modal-close");
    const devModalCancel = $("#dev-modal-cancel");
    const devWizBtnPrev = $("#dev-wiz-btn-prev");
    const devWizBtnNext = $("#dev-wiz-btn-next");
    const devWizTenant = $("#dev-wiz-tenant");
    const devWizApp = $("#dev-wiz-app");
    const devWizEui = $("#dev-wiz-eui");
    const devWizName = $("#dev-wiz-name");
    const devWizProfile = $("#dev-wiz-profile");
    const btnRandomEui = $("#dev-wiz-btn-random-eui");
    const devModalOverlay = $("#dev-modal-overlay");

    if (btnAddDev) {
        btnAddDev.addEventListener("click", showDevWizModal);
    }
    if (devModalClose) {
        devModalClose.addEventListener("click", hideDevWizModal);
    }
    if (devModalCancel) {
        devModalCancel.addEventListener("click", hideDevWizModal);
    }
    if (devWizBtnPrev) {
        devWizBtnPrev.addEventListener("click", prevDevWizStep);
    }
    if (devWizBtnNext) {
        devWizBtnNext.addEventListener("click", nextDevWizStep);
    }
    if (devWizTenant) {
        devWizTenant.addEventListener("change", onDevWizTenantChange);
    }
    if (devWizApp) {
        devWizApp.addEventListener("change", checkDevWizValidation);
    }
    if (devWizEui) {
        devWizEui.addEventListener("input", checkDevWizValidation);
    }
    if (devWizName) {
        devWizName.addEventListener("input", checkDevWizValidation);
    }
    if (devWizProfile) {
        devWizProfile.addEventListener("change", checkDevWizValidation);
    }
    if (btnRandomEui) {
        btnRandomEui.addEventListener("click", (e) => {
            e.preventDefault();
            if (devWizEui) {
                devWizEui.value = generateRandomDevEUI();
                checkDevWizValidation();
            }
        });
    }
    if (devModalOverlay) {
        devModalOverlay.addEventListener("click", (e) => {
            if (e.target === devModalOverlay) hideDevWizModal();
        });
    }
}
