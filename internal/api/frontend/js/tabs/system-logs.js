import { $, $$, escapeHtml } from "../utils.js";
import { state } from "../state.js";
import { t } from "../translate.js";

const DB_NAME = "SimLogDB";
const STORE_NAME = "system_logs";
const DB_VERSION = 1;

let dbInstance = null;

function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function addIndexedDBLog(msg, level = "info", details = null) {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const item = {
                timestamp: new Date().toISOString(),
                message: msg,
                level: level,
                details: details ? (typeof details === "object" ? JSON.stringify(details, null, 2) : details.toString()) : null
            };
            const req = store.add(item);
            req.onsuccess = () => {
                resolve(item);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to add log to IndexedDB:", e);
        return null;
    }
}

export async function getIndexedDBLogs(search = "", level = "all") {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                let logs = req.result || [];
                // Sort by ID descending (newest first)
                logs.sort((a, b) => b.id - a.id);
                
                // Filter
                if (level !== "all") {
                    logs = logs.filter(log => log.level === level);
                }
                if (search.trim()) {
                    const q = search.trim().toLowerCase();
                    logs = logs.filter(log => 
                        (log.message && log.message.toLowerCase().includes(q)) ||
                        (log.details && log.details.toLowerCase().includes(q))
                    );
                }
                resolve(logs);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to fetch logs from IndexedDB:", e);
        return [];
    }
}

export async function clearIndexedDBLogs() {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to clear logs in IndexedDB:", e);
    }
}

function getLastMondayMidnight() {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const diff = (day === 0 ? 6 : day - 1); // Days since last Monday
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - diff);
    lastMonday.setHours(0, 0, 0, 0);
    return lastMonday.getTime();
}

export async function purgeOldIndexedDBLogs() {
    const lastMonday = getLastMondayMidnight();
    const lastPurge = parseInt(localStorage.getItem("sim_logs_last_purge") || "0", 10);
    
    if (lastPurge >= lastMonday) return;
    
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        
        let count = 0;
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const logTime = new Date(cursor.value.timestamp).getTime();
                if (logTime < lastMonday) {
                    cursor.delete();
                    count++;
                }
                cursor.continue();
            } else {
                localStorage.setItem("sim_logs_last_purge", Date.now().toString());
                console.log(`IndexedDB logs: purged ${count} old entries (older than last Monday midnight).`);
            }
        };
    } catch (e) {
        console.error("Failed to purge old logs from IndexedDB:", e);
    }
}

// UI Rendering Functions
export async function renderSystemLogs() {
    const container = $("#log-container");
    if (!container) return;
    
    const searchInput = $("#sys-log-search-input");
    const levelSelect = $("#sys-log-level-select");
    
    const searchVal = searchInput ? searchInput.value : "";
    const levelVal = levelSelect ? levelSelect.value : "all";
    
    const logs = await getIndexedDBLogs(searchVal, levelVal);
    container.innerHTML = "";
    
    if (logs.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); text-align: center; font-style: italic; margin-top: 20px;">${t("no_logs_found")}</div>`;
        return;
    }
    
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const ts = [
            date.getHours().toString().padStart(2, "0"),
            date.getMinutes().toString().padStart(2, "0"),
            date.getSeconds().toString().padStart(2, "0")
        ].join(":");
        
        const el = document.createElement("div");
        el.className = `log-entry log-${log.level || 'info'}`;
        if (log.details) {
            el.classList.add("has-details");
        }
        
        let innerHTML = `<div class="log-main-line">`;
        if (log.details) {
            innerHTML += `<span class="log-toggle-icon">▶</span>`;
        }
        innerHTML += `[${ts}] ${escapeHtml(log.message)}</div>`;
        
        if (log.details) {
            innerHTML += `<div class="log-details" style="display: none;"><pre>${escapeHtml(log.details)}</pre></div>`;
        }
        
        el.innerHTML = innerHTML;
        
        if (log.details) {
            el.addEventListener("click", () => {
                const detailsEl = el.querySelector(".log-details");
                if (detailsEl) {
                    const isOpen = el.classList.toggle("open");
                    detailsEl.style.display = isOpen ? "block" : "none";
                }
            });
        }
        
        container.appendChild(el);
    });
}

export async function exportLogs() {
    const logs = await getIndexedDBLogs("", "all");
    if (logs.length === 0) {
        alert(t("no_logs_to_export"));
        return;
    }
    
    const lines = logs.map(log => {
        let line = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
        if (log.details) {
            line += `\nDetails:\n${log.details}\n`;
        }
        return line;
    });
    
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulator_system_logs_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function initSystemLogsTab() {
    // Inner tab toggling logic
    $$(".log-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-log-tab");
            
            // Toggle active classes on tab headers
            $$(".log-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            // Toggle active panels
            $$(".log-panel").forEach(p => p.style.display = "none");
            const panel = $(`#log-panel-${tabName}`);
            if (panel) panel.style.display = "flex";
            
            // If active panel is console, let it scroll to bottom
            if (tabName === "console") {
                const consoleContainer = $("#console-log-container");
                if (consoleContainer) {
                    consoleContainer.scrollTop = consoleContainer.scrollHeight;
                }
            } else if (tabName === "system") {
                renderSystemLogs();
            }
        });
    });

    // Filtering inputs setup
    const searchInput = $("#sys-log-search-input");
    const levelSelect = $("#sys-log-level-select");
    const exportBtn = $("#btn-sys-log-export");
    const clearBtn = $("#btn-sys-log-clear");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderSystemLogs();
        });
    }

    if (levelSelect) {
        levelSelect.addEventListener("change", () => {
            renderSystemLogs();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            exportLogs();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
            if (confirm(t("confirm_clear_logs"))) {
                await clearIndexedDBLogs();
                renderSystemLogs();
            }
        });
    }
}
