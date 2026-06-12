import { showLoginScreen, logEntry } from "./utils.js";

export async function api(method, path, body) {
    const opts = {
        method: method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) {
        opts.body = JSON.stringify(body);
    }
    try {
        const resp = await fetch(path, opts);
        if (resp.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/status") {
            showLoginScreen();
        }
        let data = {};
        try {
            data = await resp.json();
        } catch(e) {
            data = { error: "Failed to parse JSON response" };
        }
        
        if (!resp.ok) {
            const logMsg = `API request failed: ${method} ${path} (${resp.status})`;
            logEntry(logMsg, "error", {
                request: { method, path, body },
                response: { status: resp.status, data }
            });
        }
        return { ok: resp.ok, status: resp.status, data: data };
    } catch (err) {
        logEntry(`Network error: ${method} ${path}`, "error", {
            request: { method, path, body },
            error: err.message
        });
        return { ok: false, status: 0, data: { error: err.message } };
    }
}
