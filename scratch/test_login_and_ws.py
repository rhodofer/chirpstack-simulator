import asyncio
import requests
import websockets
import json

API_URL = "https://api-falt.iofeteknoloji.com/api/v1"
WS_URL = "wss://api-falt.iofeteknoloji.com/api/v1/ws/live"

def get_auth_token():
    credentials = [
        ("admin@falt.com", "admin123"),
        ("admin@falt.com", "admin"),
        ("admin@falt.com", "81Rhod81"),
        ("rhod@falt.com", "admin123"),
        ("user@falt.com", "user123"),
        ("demo@falt.com", "demo123"),
    ]
    for email, password in credentials:
        try:
            res = requests.post(f"{API_URL}/auth/login", data={"username": email, "password": password}, timeout=5)
            if res.status_code == 200:
                token = res.json().get("access_token")
                print(f"[AUTH SUCCESS] Logged in as {email}")
                return token
        except Exception as e:
            pass
    print("[AUTH ERROR] Could not log in with default credentials.")
    return None

async def test_ws():
    token = get_auth_token()
    url = f"{WS_URL}?auth_token={token}" if token else WS_URL
    print(f"Connecting to {url}...")
    headers = {"Origin": "https://falt.iofeteknoloji.com"}
    try:
        async with websockets.connect(url, additional_headers=headers) as ws:
            print("[WS SUCCESS] Connected!")
            for _ in range(5):
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                print("Received:", msg)
    except Exception as e:
        print("[WS ERROR]:", e)

if __name__ == "__main__":
    asyncio.run(test_ws())
