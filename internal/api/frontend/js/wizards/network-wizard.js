import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";
import { fetchApplications } from "../tabs/networks.js";

let netWizCurrentStep = 1;

export function populateNetWizTenantSelect() {
    const netWizTenant = $("#net-wiz-tenant");
    if (!netWizTenant) return;
    netWizTenant.innerHTML = "";
    if (state.organizations.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Önce organizasyon oluşturun";
        opt.disabled = true;
        netWizTenant.appendChild(opt);
        return;
    }
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Lütfen seçiniz...";
    netWizTenant.appendChild(defaultOpt);

    for (let i = 0; i < state.organizations.length; i++) {
        const opt = document.createElement("option");
        opt.value = state.organizations[i].id;
        opt.textContent = state.organizations[i].name;
        netWizTenant.appendChild(opt);
    }
}

export function showNetModal() {
    const netWizName = $("#net-wiz-name");
    const netWizPrefix = $("#net-wiz-prefix");
    const netModalOverlay = $("#net-modal-overlay");

    if (netWizName) netWizName.value = "";
    if (netWizPrefix) netWizPrefix.value = "";
    
    populateNetWizTenantSelect();
    netWizCurrentStep = 1;
    renderNetWizStep();
    if (netModalOverlay) netModalOverlay.style.display = "flex";
    setTimeout(() => { if (netWizTenant) netWizTenant.focus(); }, 100);
}

export function hideNetModal() {
    const netModalOverlay = $("#net-modal-overlay");
    if (netModalOverlay) netModalOverlay.style.display = "none";
}

export function renderNetWizStep() {
    const netWizBtnPrev = $("#net-wiz-btn-prev");
    const netWizBtnNext = $("#net-wiz-btn-next");
    const netSummaryOrgName = $("#net-summary-org-name");
    const netSummaryOrgId = $("#net-summary-org-id");
    const netSummaryAppName = $("#net-summary-app-name");
    const netSummaryPrefix = $("#net-summary-prefix");
    
    const netWizTenant = $("#net-wiz-tenant");
    const netWizName = $("#net-wiz-name");
    const netWizPrefix = $("#net-wiz-prefix");

    for (let i = 1; i <= 3; i++) {
        const pane = $("#net-wiz-pane-" + i);
        if (pane) pane.style.display = (i === netWizCurrentStep) ? "block" : "none";
        
        const stepIndicator = $("#net-wiz-step-" + i);
        if (stepIndicator) {
            if (i === netWizCurrentStep) {
                stepIndicator.classList.add("active");
                stepIndicator.style.color = "var(--accent)";
            } else {
                stepIndicator.classList.remove("active");
                stepIndicator.style.color = "";
            }
        }
    }

    if (netWizBtnPrev) {
        netWizBtnPrev.style.display = (netWizCurrentStep === 1) ? "none" : "inline-block";
    }

    if (netWizBtnNext) {
        netWizBtnNext.textContent = (netWizCurrentStep === 3) ? t("wiz_btn_confirm") : t("btn_next");
    }

    if (netWizCurrentStep === 3) {
        if (netSummaryOrgName) netSummaryOrgName.textContent = netWizTenant && netWizTenant.selectedIndex >= 0 ? netWizTenant.options[netWizTenant.selectedIndex].text : "";
        if (netSummaryOrgId) netSummaryOrgId.textContent = netWizTenant ? "ID: " + netWizTenant.value : "";
        if (netSummaryAppName) netSummaryAppName.textContent = netWizName ? netWizName.value.trim() : "";
        if (netSummaryPrefix) netSummaryPrefix.textContent = netWizPrefix ? netWizPrefix.value.trim() : "";
    }

    checkNetWizValidation();
}

export function checkNetWizValidation() {
    const netWizBtnNext = $("#net-wiz-btn-next");
    const netWizTenant = $("#net-wiz-tenant");
    const netWizName = $("#net-wiz-name");
    
    if (!netWizBtnNext) return;
    if (netWizCurrentStep === 1) {
        const hasTenant = netWizTenant && netWizTenant.value !== "";
        netWizBtnNext.disabled = !hasTenant;
    } else if (netWizCurrentStep === 2) {
        const hasName = netWizName && netWizName.value.trim() !== "";
        netWizBtnNext.disabled = !hasName;
    } else {
        netWizBtnNext.disabled = false;
    }
}

export function prevNetWizStep() {
    if (netWizCurrentStep > 1) {
        netWizCurrentStep--;
        renderNetWizStep();
    }
}

export function nextNetWizStep() {
    if (netWizCurrentStep === 3) {
        submitNetWiz();
    } else {
        netWizCurrentStep++;
        renderNetWizStep();
    }
}

export async function createApplication(name, tenantId, description) {
    const r = await api("POST", "/api/applications", {
        name: name,
        tenant_id: tenantId,
        description: description || ""
    });
    if (r.ok) {
        const app = r.data;
        logEntry("New network created: " + app.name + " (ID: " + app.id + ")", "success");
        showToast("'" + app.name + "' " + (state.language === "tr" ? "ağı oluşturuldu." : "network created."), "success");
        
        if (state.currentStatus === "running" || state.currentStatus === "starting") {
            setTimeout(() => {
                showToast(
                    state.language === "tr"
                        ? "Simülasyon çalışıyor. Yeni ağın simüle edilmesi için simülasyonu durdurup tekrar başlatın."
                        : "Simulation is running. Stop and restart the simulation for the new network to be simulated.",
                    "warning"
                );
            }, 800);
        }

        await fetchApplications(state.netTenantFilter);
        return true;
    } else {
        const errMsg = (r.data && r.data.error) || (state.language === "tr" ? "Bilinmeyen hata" : "Unknown error");
        logEntry("Failed to create network: " + errMsg, "error");
        showToast(errMsg, "error");
        return false;
    }
}

export async function submitNetWiz() {
    const netWizName = $("#net-wiz-name");
    const netWizTenant = $("#net-wiz-tenant");
    const netWizPrefix = $("#net-wiz-prefix");
    const netWizBtnNext = $("#net-wiz-btn-next");

    const name = netWizName.value.trim();
    const tenantId = netWizTenant.value;
    const description = netWizPrefix.value.trim();
    if (!name || !tenantId) return;

    if (netWizBtnNext) {
        netWizBtnNext.disabled = true;
        netWizBtnNext.textContent = t("wiz_btn_creating");
    }

    const ok = await createApplication(name, tenantId, description);
    if (netWizBtnNext) {
        netWizBtnNext.disabled = false;
        netWizBtnNext.textContent = t("wiz_btn_confirm");
    }
    if (ok) hideNetModal();
}

export function initNetWizard() {
    const btnAddNet = $("#btn-add-net");
    const netModalClose = $("#net-modal-close");
    const netModalCancel = $("#net-modal-cancel");
    const netWizBtnPrev = $("#net-wiz-btn-prev");
    const netWizBtnNext = $("#net-wiz-btn-next");
    const netWizTenant = $("#net-wiz-tenant");
    const netWizName = $("#net-wiz-name");
    const netModalOverlay = $("#net-modal-overlay");

    if (btnAddNet) {
        btnAddNet.addEventListener("click", showNetModal);
    }
    if (netModalClose) {
        netModalClose.addEventListener("click", hideNetModal);
    }
    if (netModalCancel) {
        netModalCancel.addEventListener("click", hideNetModal);
    }
    if (netWizBtnPrev) {
        netWizBtnPrev.addEventListener("click", prevNetWizStep);
    }
    if (netWizBtnNext) {
        netWizBtnNext.addEventListener("click", nextNetWizStep);
    }
    if (netWizTenant) {
        netWizTenant.addEventListener("change", checkNetWizValidation);
    }
    if (netWizName) {
        netWizName.addEventListener("input", checkNetWizValidation);
    }
    if (netModalOverlay) {
        netModalOverlay.addEventListener("click", (e) => {
            if (e.target === netModalOverlay) hideNetModal();
        });
    }
}
