import asyncio
import json
import time
import websockets

WS_URL = "wss://api-falt.iofeteknoloji.com/api/v1/ws/live"
MONITOR_DURATION_SEC = 600  # 10 dakika

async def monitor():
    print(f"[MONITOR] Starting 10-minute live telemetry monitoring on {WS_URL}...")
    start_time = time.time()
    device_counts = {}
    total_received = 0
    errors = 0

    headers = {
        "Origin": "http://localhost:3000",
        "User-Agent": "TelemetryMonitor/1.0"
    }

    try:
        async with websockets.connect(WS_URL, additional_headers=headers) as ws:
            print("[MONITOR] Connected to WebSocket live stream successfully!")
            while time.time() - start_time < MONITOR_DURATION_SEC:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(message)
                    if data.get("type") == "telemetry":
                        dev_name = data.get("device_name") or data.get("device_id")
                        device_counts[dev_name] = device_counts.get(dev_name, 0) + 1
                        total_received += 1
                        elapsed = int(time.time() - start_time)
                        print(f"[{elapsed}s] Received telemetry from: {dev_name} | Total count: {total_received}")
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    errors += 1
                    print(f"[MONITOR WARNING] Error receiving frame: {e}")
                    await asyncio.sleep(1)
    except Exception as e:
        print(f"[MONITOR ERROR] Connection failed: {e}")

    duration = int(time.time() - start_time)
    print(f"\n================ MONITORING REPORT ({duration}s) ================")
    print(f"Total Telemetry Messages Received: {total_received}")
    print("Per-Device Breakdown:")
    for dev, count in sorted(device_counts.items()):
        print(f"  - {dev}: {count} messages")
    print(f"WebSocket Errors/Reconnections: {errors}")
    print("==================================================================")

if __name__ == "__main__":
    asyncio.run(monitor())
