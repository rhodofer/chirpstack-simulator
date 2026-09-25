import asyncio
import json
import time
import requests
import websockets

API_URL = "https://api-falt.iofeteknoloji.com/api/v1"
WS_URL = "wss://api-falt.iofeteknoloji.com/api/v1/ws/live"
MONITOR_DURATION_SEC = 180  # 3 dakika

def get_auth_token():
    try:
        res = requests.post(f"{API_URL}/auth/login", data={"username": "admin@falt.com", "password": "admin123"}, timeout=10)
        if res.status_code == 200:
            token = res.json().get("access_token")
            print("[AUTH] Successfully authenticated as admin@falt.com")
            return token
    except Exception as e:
        print(f"[AUTH ERROR] Failed to login: {e}")
    return None

async def monitor():
    token = get_auth_token()
    if not token:
        print("[MONITOR FATAL] Token acquisition failed. Exiting.")
        return

    full_ws_url = f"{WS_URL}?auth_token={token}"
    print(f"[MONITOR] Starting 3-minute (180s) live telemetry capture...")
    print(f"[MONITOR] Stream URL: {WS_URL}")

    start_time = time.time()
    device_counts = {}
    device_last_data = {}
    logs = []
    total_received = 0
    errors = 0

    headers = {
        "Origin": "https://falt.iofeteknoloji.com",
        "User-Agent": "TelemetryMonitor/1.0"
    }

    try:
        async with websockets.connect(full_ws_url, additional_headers=headers) as ws:
            print("[MONITOR] Connected to WebSocket live telemetry stream successfully!")
            print(f"[MONITOR] Listening for telemetry frames for 3 minutes ({MONITOR_DURATION_SEC} seconds)...")
            
            while time.time() - start_time < MONITOR_DURATION_SEC:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(message)
                    if data.get("type") == "telemetry":
                        dev_name = data.get("device_name") or data.get("device_id")
                        device_counts[dev_name] = device_counts.get(dev_name, 0) + 1
                        device_last_data[dev_name] = data.get("data") or {}
                        total_received += 1
                        elapsed = int(time.time() - start_time)
                        logs.append({
                            "elapsed_sec": elapsed,
                            "device_name": dev_name,
                            "device_id": data.get("device_id"),
                            "application_name": data.get("application_name"),
                            "data": data.get("data"),
                            "rssi": data.get("rssi"),
                            "snr": data.get("snr")
                        })
                        payload_str = json.dumps(data.get("data") or {})
                        print(f"[{elapsed:03d}s / {MONITOR_DURATION_SEC}s] [{data.get('application_name') or 'N/A'}] Telemetry from '{dev_name}': {payload_str}")
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    errors += 1
                    print(f"[MONITOR WARNING] Frame error: {e}")
                    await asyncio.sleep(1)
    except Exception as e:
        print(f"[MONITOR ERROR] Connection error: {e}")

    duration = int(time.time() - start_time)
    report = {
        "duration_sec": duration,
        "total_messages": total_received,
        "errors": errors,
        "per_device": device_counts,
        "last_payloads": device_last_data
    }
    
    with open("scratch/telemetry_capture_3m.json", "w", encoding="utf-8") as f:
        json.dump({"report": report, "logs": logs}, f, indent=2, ensure_ascii=False)

    print(f"\n================ 3-MINUTE TELEMETRY CAPTURE REPORT ({duration}s) ================")
    print(f"Total Telemetry Messages Received: {total_received}")
    print("Per-Device Message Breakdown:")
    for dev, count in sorted(device_counts.items()):
        print(f"  - {dev}: {count} messages | Last Data: {json.dumps(device_last_data.get(dev) or {})}")
    print(f"WebSocket Errors: {errors}")
    print("Full capture JSON saved to: scratch/telemetry_capture_3m.json")
    print("==========================================================================")

if __name__ == "__main__":
    asyncio.run(monitor())
