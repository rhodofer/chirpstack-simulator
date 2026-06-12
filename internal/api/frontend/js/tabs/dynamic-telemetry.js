import { state } from "../state.js";
import { $, $$, escapeHtml, showToast, logEntry } from "../utils.js";
import { api } from "../api.js";
import { t } from "../translate.js";

let telemetryChart = null;
let activeOrgConfig = null;

export const templates = {
    custom: `// Yazdiğınız betik fPort, fCnt, devEUI ve deviceName parametrelerini kullanabilir.
// Bir byte dizisi (örn: return [1, 2, 3]) veya hex string (örn: return "010203") döndürmelidir.

var val = 25.4 + Math.random();
var valInt = Math.round(val * 10); // 25.4 -> 254
var byte1 = (valInt >> 8) & 0xFF;
var byte2 = valInt & 0xFF;

return [byte1, byte2];`,

    temperature: `// Sicaklik Sensörü Şablonu (Sine Wave + Gürültü)
// Diurnal döngü (günlük sicaklik değişimi: 20°C - 30°C)
// fCnt (uplink sayaci) zaman adimi olarak kullanilir.

var baseTemp = 25; // Ortalama sicaklik
var amplitude = 5; // Salinim miktari
var period = 96;   // 96 adim = 24 saat (15 dk veri sikliği için)
var sineVal = Math.sin((fCnt * 2 * Math.PI) / period);
var noise = Math.random() - 0.5; // -0.5°C ile +0.5°C arasi gürültü

var temp = baseTemp + amplitude * sineVal + noise;

// Anomali Kontrolü (Spike / Drift)
if (typeof anomaly !== 'undefined' && anomaly.active) {
    if (anomaly.type === 'spike') {
        temp += 15; // 15°C ani artiş
    } else if (anomaly.type === 'drift') {
        temp += anomaly.driftValue; // Birikimli sapma
    }
}

// Hassasiyet için 100 ile çarpip 2-byte tam sayiya çeviriyoruz (örn: 25.43°C -> 2543)
var tempInt = Math.round(temp * 100);
if (tempInt < 0) tempInt = 0xFFFF + tempInt + 1; // 2's complement

var byte1 = (tempInt >> 8) & 0xFF;
var byte2 = tempInt & 0xFF;

return [byte1, byte2];`,

    humidity: `// Nem Sensörü Şablonu (Random Walk)
// Bir önceki nem değerinden rastgele artiş/azaliş yapar.
// fCnt ve devEUI kullanilarak kararli LCG pseudo-random walk simüle edilir.

function lcg(seed) {
    var m = 0x80000000; // 2^31
    var a = 1103515245;
    var c = 12345;
    var state = seed ? seed : 0;
    return function() {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
}

// Cihaza özgü benzersiz bir seed üret
var seed = 0;
for (var i = 0; i < devEUI.length; i++) {
    seed = (seed + devEUI.charCodeAt(i)) * 31;
}

var rand = lcg(seed & 0xFFFFFFFF);
var humidity = 60.0; // Başlangiç nemi %60

// fCnt adimina kadar olan tüm yürüyüşü yeniden hesapla (kararli simülasyon)
for (var step = 0; step < fCnt; step++) {
    var change = (rand() - 0.5) * 4; // her adimda -%2 ile +%2 arasi değişim
    humidity += change;
    if (humidity < 30) humidity = 30; // Min sinir %30
    if (humidity > 90) humidity = 90; // Max sinir %90
}

// Anomali Kontrolü (Spike / Drift)
if (typeof anomaly !== 'undefined' && anomaly.active) {
    if (anomaly.type === 'spike') {
        humidity = 95; // Ani nem artişi %95
    } else if (anomaly.type === 'drift') {
        humidity += anomaly.driftValue;
        if (humidity > 100) humidity = 100;
        if (humidity < 0) humidity = 0;
    }
}

var humVal = Math.round(humidity);
return [humVal];`,

    meter: `// Su Sayaci Şablonu (Linear Drift / Birikimli Artiş)
// Tüketim sürekli artar, artiş miktari hafif değişkendir.

var baseMeter = 10000; // Başlangiç endeksi: 10.000 Litre
var averageConsumptionPerStep = 15; // Adim başina ortalama 15L tüketim

// LCG random generator
var seed = 0;
for (var i = 0; i < devEUI.length; i++) {
    seed = (seed + devEUI.charCodeAt(i)) * 31;
}

var m = 0x80000000;
var state = (seed + fCnt) & 0xFFFFFFFF;
var randVal = ((1103515245 * state + 12345) % m) / (m - 1);

var consumption = fCnt * averageConsumptionPerStep + (randVal * 10);
var totalConsumption = baseMeter + consumption;

// Anomali Kontrolü (Spike / Drift)
if (typeof anomaly !== 'undefined' && anomaly.active) {
    if (anomaly.type === 'spike') {
        totalConsumption += 500; // Ani yüksek harcama (su kaçaği simülasyonu)
    } else if (anomaly.type === 'drift') {
        totalConsumption += anomaly.driftValue * 10;
    }
}

var totalConsumptionInt = Math.round(totalConsumption);

// 32-bit tamsayiyi 4-byte olarak kodluyoruz (Big-Endian)
var b1 = (totalConsumptionInt >> 24) & 0xFF;
var b2 = (totalConsumptionInt >> 16) & 0xFF;
var b3 = (totalConsumptionInt >> 8) & 0xFF;
var b4 = totalConsumptionInt & 0xFF;

return [b1, b2, b3, b4];`,

    battery: `// Pil Seviyesi Şablonu (Battery Decay / Yavaş Azaliş)
// Pil seviyesi zamanla/gönderim sayisi arttikça yavaşça düşer.

var initialBattery = 100.0;
var decayRate = 0.05; // Gönderim başina %0.05 düşüş
var currentBattery = initialBattery - (fCnt * decayRate);
if (currentBattery < 0) currentBattery = 0;

// Anomali Kontrolü (Spike / Drift)
if (typeof anomaly !== 'undefined' && anomaly.active) {
    if (anomaly.type === 'spike') {
        currentBattery = 100; // Ani %100'e yükseliş (sensör hatasi)
    } else if (anomaly.type === 'drift') {
        currentBattery -= anomaly.driftValue;
        if (currentBattery < 0) currentBattery = 0;
    }
}

var batVal = Math.round(currentBattery);
return [batVal];`
};

export function populateTelemetryOrgsSelect() {
    const orgSelect = $("#telemetry-org-select");
    if (!orgSelect) return;
    orgSelect.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = state.language === "tr" ? "Lütfen seçiniz..." : "Please select...";
    orgSelect.appendChild(defaultOpt);

    state.organizations.forEach(org => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        orgSelect.appendChild(opt);
    });
}

export async function loadOrgTelemetryConfig() {
    const orgSelect = $("#telemetry-org-select");
    const templateSelect = $("#telemetry-template-select");
    const scriptEditor = $("#telemetry-script-editor");
    const btnTest = $("#btn-telemetry-test");
    const btnSave = $("#btn-telemetry-save");

    if (!orgSelect || !templateSelect || !scriptEditor || !btnTest || !btnSave) return;

    const orgId = orgSelect.value;
    if (!orgId) {
        templateSelect.disabled = true;
        scriptEditor.disabled = true;
        scriptEditor.value = "";
        btnTest.disabled = true;
        btnSave.disabled = true;
        activeOrgConfig = null;
        clearPreview();
        return;
    }

    // Load configuration
    const r = await api("GET", "/api/org-configs/" + orgId);
    if (r.ok && r.data) {
        activeOrgConfig = r.data;
        templateSelect.disabled = false;
        scriptEditor.disabled = false;
        btnTest.disabled = false;
        btnSave.disabled = false;

        const savedScript = r.data.payload_script || "";
        scriptEditor.value = savedScript;

        // Auto-select template category if matches
        detectAndSelectTemplate(savedScript);
    } else {
        showToast(state.language === "tr" ? "Ayarlar yüklenemedi!" : "Failed to load settings!", "error");
    }
}

function detectAndSelectTemplate(script) {
    const templateSelect = $("#telemetry-template-select");
    if (!templateSelect) return;

    if (!script) {
        templateSelect.value = "custom";
        return;
    }

    // Simple heuristic check based on comments/variables to match template dropdown
    if (script.includes("Sıcaklık Sensörü") || script.includes("diurnal") || script.includes("baseTemp")) {
        templateSelect.value = "temperature";
    } else if (script.includes("Nem Sensörü") || script.includes("random walk") || script.includes("humidity")) {
        templateSelect.value = "humidity";
    } else if (script.includes("Su Sayacı") || script.includes("Water Meter") || script.includes("baseMeter")) {
        templateSelect.value = "meter";
    } else if (script.includes("Pil Seviyesi") || script.includes("battery") || script.includes("decayRate")) {
        templateSelect.value = "battery";
    } else {
        templateSelect.value = "custom";
    }
}

export function handleTemplateSelectChange() {
    const templateSelect = $("#telemetry-template-select");
    const scriptEditor = $("#telemetry-script-editor");
    if (!templateSelect || !scriptEditor) return;

    const val = templateSelect.value;
    if (templates[val]) {
        scriptEditor.value = templates[val];
    }
}

// Convert bytes to hex string helper
function bytesToHex(bytes) {
    return Array.from(bytes, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('').toUpperCase();
}

// Parse hex string to byte array helper
function hexToBytes(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

export function simulateTelemetry() {
    const scriptEditor = $("#telemetry-script-editor");
    const templateSelect = $("#telemetry-template-select");
    const logBody = $("#telemetry-log-body");

    if (!scriptEditor || !templateSelect || !logBody) return;

    const script = scriptEditor.value.trim();
    if (!script) {
        showToast(state.language === "tr" ? "Lütfen önce bir betik yazın!" : "Please write a script first!", "warning");
        return;
    }

    const template = templateSelect.value;
    const devEUI = "1234567890ABCDEF";
    const deviceName = "test-device-1";
    
    const stepsData = [];
    const chartLabels = [];
    const chartValues = [];

    logBody.innerHTML = "";

    for (let fCnt = 0; fCnt < 24; fCnt++) {
        let payloadBytes = [];
        let errorMsg = "";

        try {
            // Sandboxed evaluation on client side
            const testFunc = new Function("fPort", "fCnt", "devEUI", "deviceName", `
                try {
                    ${script}
                } catch(e) {
                    return { error: e.toString() };
                }
            `);

            const result = testFunc(10, fCnt, devEUI, deviceName);

            if (result && typeof result === "object" && result.error) {
                errorMsg = result.error;
            } else if (Array.isArray(result)) {
                payloadBytes = result.map(v => parseInt(v, 10) || 0);
            } else if (typeof result === "string") {
                payloadBytes = hexToBytes(result.replace(/[^0-9a-fA-F]/g, ''));
            } else {
                errorMsg = "Return type is not array or string";
            }
        } catch (e) {
            errorMsg = e.toString();
        }

        let hex = "";
        let decodedVal = "—";
        let numericVal = null;

        if (errorMsg) {
            hex = "ERROR";
            decodedVal = errorMsg;
        } else {
            hex = bytesToHex(payloadBytes);
            
            // Decoders for chart plotting
            if (template === "temperature") {
                if (payloadBytes.length >= 2) {
                    let val = (payloadBytes[0] << 8) | payloadBytes[1];
                    if (val & 0x8000) val = val - 0x10000;
                    numericVal = val / 100;
                    decodedVal = numericVal.toFixed(2) + " °C";
                }
            } else if (template === "humidity") {
                if (payloadBytes.length >= 1) {
                    numericVal = payloadBytes[0];
                    decodedVal = numericVal + " % RH";
                }
            } else if (template === "meter") {
                if (payloadBytes.length >= 4) {
                    let val = (payloadBytes[0] << 24) | (payloadBytes[1] << 16) | (payloadBytes[2] << 8) | payloadBytes[3];
                    if (val < 0) val = 0xFFFFFFFF + val + 1;
                    numericVal = val;
                    decodedVal = numericVal + " L";
                }
            } else if (template === "battery") {
                if (payloadBytes.length >= 1) {
                    numericVal = payloadBytes[0];
                    decodedVal = numericVal + " %";
                }
            } else {
                // Heuristics for custom scripts
                if (payloadBytes.length === 1) {
                    numericVal = payloadBytes[0];
                    decodedVal = numericVal.toString();
                } else if (payloadBytes.length === 2) {
                    let val = (payloadBytes[0] << 8) | payloadBytes[1];
                    if (val & 0x8000) val = val - 0x10000;
                    numericVal = val;
                    decodedVal = numericVal.toString();
                } else if (payloadBytes.length === 4) {
                    let val = (payloadBytes[0] << 24) | (payloadBytes[1] << 16) | (payloadBytes[2] << 8) | payloadBytes[3];
                    numericVal = val;
                    decodedVal = numericVal.toString();
                } else {
                    decodedVal = `Bytes: [${payloadBytes.join(', ')}]`;
                }
            }
        }

        stepsData.push({ fCnt, hex, decodedVal });
        chartLabels.push("fCnt " + fCnt);
        chartValues.push(numericVal);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fCnt + 1}</td>
            <td>${fCnt}</td>
            <td style="font-weight:600; color:${hex === 'ERROR' ? 'var(--danger)' : 'var(--accent)'};">${hex}</td>
            <td>${escapeHtml(decodedVal)}</td>
        `;
        logBody.appendChild(tr);
    }

    renderPreviewChart(chartLabels, chartValues, template);
}

function renderPreviewChart(labels, data, template) {
    const ctx = document.getElementById("telemetry-preview-chart");
    if (!ctx) return;

    if (telemetryChart) {
        telemetryChart.destroy();
    }

    let yLabel = "Değer";
    if (template === "temperature") yLabel = "Sıcaklık (°C)";
    else if (template === "humidity") yLabel = "Nem (% RH)";
    else if (template === "meter") yLabel = "Tüketim (L)";
    else if (template === "battery") yLabel = "Pil (%)";

    const allNull = data.every(v => v === null);

    telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: yLabel,
                data: data,
                borderColor: 'var(--accent)',
                backgroundColor: 'rgba(var(--accent-rgb), 0.05)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: 'var(--accent)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: !allNull,
                    labels: {
                        color: 'var(--text)'
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(120, 120, 120, 0.1)' },
                    ticks: { color: 'var(--text-dim)', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(120, 120, 120, 0.1)' },
                    ticks: { color: 'var(--text-dim)', font: { size: 9 } },
                    display: !allNull
                }
            }
        }
    });
}

function clearPreview() {
    if (telemetryChart) {
        telemetryChart.destroy();
        telemetryChart = null;
    }
    const logBody = $("#telemetry-log-body");
    if (logBody) {
        logBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">Lütfen organizasyon seçip test butonuna basın.</td>
            </tr>
        `;
    }
}

export async function saveTelemetryScript() {
    const orgSelect = $("#telemetry-org-select");
    const scriptEditor = $("#telemetry-script-editor");
    const btnSave = $("#btn-telemetry-save");

    if (!orgSelect || !scriptEditor || !btnSave || !activeOrgConfig) return;

    const orgId = orgSelect.value;
    const script = scriptEditor.value.trim();

    btnSave.disabled = true;
    btnSave.textContent = state.language === "tr" ? "Kaydediliyor..." : "Saving...";

    const updatedConfig = { ...activeOrgConfig, payload_script: script };

    const r = await api("POST", "/api/org-configs/" + orgId, updatedConfig);
    
    btnSave.disabled = false;
    btnSave.textContent = state.language === "tr" ? "✓ Ayarları Kaydet" : "✓ Save Settings";

    if (r.ok) {
        activeOrgConfig.payload_script = script;
        logEntry("Telemetry payload script saved for organization ID: " + orgId, "success");
        showToast(state.language === "tr" ? "Betik başarıyla kaydedildi." : "Script saved successfully.", "success");
    } else {
        const errMsg = (r.data && r.data.error) || "Error saving configuration";
        logEntry("Failed to save telemetry script: " + errMsg, "error");
        showToast(errMsg, "error");
    }
}

export function initDynamicTelemetryTab() {
    const orgSelect = $("#telemetry-org-select");
    const templateSelect = $("#telemetry-template-select");
    const btnTest = $("#btn-telemetry-test");
    const btnSave = $("#btn-telemetry-save");

    if (orgSelect) {
        orgSelect.addEventListener("change", loadOrgTelemetryConfig);
    }
    if (templateSelect) {
        templateSelect.addEventListener("change", handleTemplateSelectChange);
    }
    if (btnTest) {
        btnTest.addEventListener("click", simulateTelemetry);
    }
    if (btnSave) {
        btnSave.addEventListener("click", saveTelemetryScript);
    }
}
