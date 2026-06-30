/**
 * passive-mode-ui.js
 * Manages UI state when passive mode is active or inactive.
 */
import { state } from "./state.js";
import { t } from "./translate.js";

/**
 * Applies or removes passive mode UI locking across all management tabs.
 * @param {boolean} isPassive
 */
export function applyPassiveModeUI(isPassive) {
    // Update global state
    state.passiveMode = isPassive;

    // Toggle topbar badge
    const badge = document.getElementById("passive-mode-badge");
    if (badge) {
        badge.style.display = isPassive ? "flex" : "none";
    }

    // Lock / unlock write buttons
    const writeSelectors = [
        "#btn-add-org",
        "#btn-add-gw",
        "#btn-add-dp",
        "#btn-add-net",
        "#btn-add-dev",
    ];

    writeSelectors.forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.disabled = isPassive;
        if (isPassive) {
            el.classList.add("passive-locked");
            el.setAttribute("title", t("passive_locked_hint") || "Pasif modda değişiklik yapılamaz");
        } else {
            el.classList.remove("passive-locked");
            el.removeAttribute("title");
        }
    });

    // Lock all dynamically rendered delete/edit buttons (table rows)
    // These are re-applied after each render via applyRowLocks()
    applyRowLocks(isPassive);

    // Toggle passive mode indicator on settings toggle if present
    const toggle = document.getElementById("passive-mode-toggle");
    if (toggle && toggle.checked !== isPassive) {
        toggle.checked = isPassive;
    }

    // Show/hide passive mode options section
    const optionsSection = document.getElementById("passive-mode-options");
    if (optionsSection) {
        optionsSection.style.display = isPassive ? "block" : "none";
    }
}

/**
 * Locks/unlocks action buttons inside table rows (delete, edit, anomaly, etc.).
 * Must be called after each table re-render when passive mode is active.
 * @param {boolean} isPassive
 */
export function applyRowLocks(isPassive) {
    const rowActionSelectors = [
        ".delete-btn",
        ".edit-btn",
        ".dev-table-interval-select",
        ".dev-interval-select"
    ];

    rowActionSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
            el.disabled = isPassive;
            if (isPassive) {
                el.classList.add("passive-locked");
                el.setAttribute("title", t("passive_locked_hint") || "Pasif modda değişiklik yapılamaz");
            } else {
                el.classList.remove("passive-locked");
                el.removeAttribute("title");
            }
        });
    });
}
