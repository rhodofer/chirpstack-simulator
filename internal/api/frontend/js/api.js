import { showLoginScreen } from "./utils.js";

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
        const data = await resp.json();
        return { ok: resp.ok, status: resp.status, data: data };
    } catch (err) {
        return { ok: false, status: 0, data: { error: err.message } };
    }
}
