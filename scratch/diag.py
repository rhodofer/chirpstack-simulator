import requests
import time

def run_diagnostic():
    session = requests.Session()
    
    # 1. Login
    login_url = "http://localhost:9002/api/auth/login"
    login_data = {
        "username": "admin@falt.com",
        "password": "admin123"
    }
    
    r = session.post(login_url, json=login_data)
    print("Login status:", r.status_code)
    
    tenant_id = "7fb09330-0802-4363-829b-4c4db6b97d62"
    dev_eui = "1208d1677282f202"
    app_id = "92172b4d-c71a-4697-86e5-aec320f2cf7c"
    dp_id = "9fb8ffa3-36e0-4db3-934f-7ece03fad6a0"
    
    # 2. Delete existing device
    r = session.delete(f"http://localhost:9002/api/devices/{dev_eui}")
    print("Delete device status:", r.status_code)

    # 3. Re-create device (now it should trigger CreateKeys on the backend)
    create_data = {
        "dev_eui": dev_eui,
        "name": "Test Cihazi",
        "application_id": app_id,
        "device_profile_id": dp_id,
        "description": "Manuel olusturulan test cihazi",
        "is_disabled": False
    }
    r = session.post("http://localhost:9002/api/devices", json=create_data)
    print("Create device status:", r.status_code, r.text)

    # 4. Get Org Config
    r = session.get(f"http://localhost:9002/api/org-configs/{tenant_id}")
    cfg = r.json()

    # 5. Start Simulation
    r = session.post("http://localhost:9002/api/start", json=cfg)
    print("\nStart simulation status:", r.status_code, r.text)
    
    if r.status_code != 200:
        return

    # Wait 5 seconds for simulation to initialize devices
    print("Waiting 5 seconds for simulation...")
    time.sleep(5)

    # 6. Get simulation devices
    r = session.get("http://localhost:9002/api/simulation/devices")
    print("\n--- SIMULATION DEVICES ---")
    if r.status_code == 200:
        devices = r.json().get("devices", [])
        found = False
        for dev in devices:
            print(f"DevEUI: {dev.get('dev_eui')} | Name: {dev.get('device_name')} | App Name: {dev.get('app_name')} | App ID: {dev.get('application_id')}")
            if dev.get('dev_eui') == dev_eui:
                found = True
        if found:
            print("\nSUCCESS: Manual device is actively simulated now!")
        else:
            print("\nFAIL: Manual device not found in active simulation devices.")
    else:
        print("Failed:", r.status_code, r.text)

    # 7. Stop Simulation
    r = session.post("http://localhost:9002/api/stop")
    print("\nStop simulation status:", r.status_code, r.text)

if __name__ == '__main__':
    run_diagnostic()
