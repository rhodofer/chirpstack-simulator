import requests
import json
import time
import subprocess

session = requests.Session()

# 1. Login
login_url = "http://localhost:9002/api/auth/login"
login_payload = {
    "username": "admin@falt.com",
    "password": "admin123"
}
try:
    r = session.post(login_url, json=login_payload)
    print("Login Status:", r.status_code)
except Exception as e:
    print("Login failed:", e)
    exit(1)

# 2. Stop any running simulation first
try:
    r = session.post("http://localhost:9002/api/stop")
    print("Stop Status:", r.status_code)
    # Wait for it to become idle
    time.sleep(2)
except Exception as e:
    pass

# 3. Start Simulation with 5-byte payload to trigger Info telemetry logs
start_url = "http://localhost:9002/api/start"
start_payload = {
    "tenant_id": "d49ba144-014c-43a1-85a4-cfa3ecbac0bc",
    "device_count": 5,
    "gateway_count": 1,
    "duration": "10m",
    "activation_time": "5s",
    "uplink_interval": "10s",
    "app_name": "Kullanici-4",
    "device_prefix": "sim-dev",
    "f_port": 10,
    "payload": "001903F521",
    "frequency": 868100000,
    "bandwidth": 125000,
    "spreading_factor": 7,
    "event_topic_template": "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}",
    "command_topic_template": "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"
}

try:
    r = session.post(start_url, json=start_payload)
    print("Start Status:", r.status_code)
    print("Start Response:", r.text)
except Exception as e:
    print("Start request failed:", e)

# 4. Wait for OTAA Join and uplink generation (sleeping 25s so we can get multiple uplinks)
print("Waiting 25 seconds for OTAA joins and telemetry...")
time.sleep(25)

# 5. Read Docker logs
print("=== DOCKER LOGS ===")
result = subprocess.run(["docker", "logs", "--tail", "50", "chirpstack-simulator-chirpstack-simulator-1"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print(result.stdout)
print(result.stderr)
