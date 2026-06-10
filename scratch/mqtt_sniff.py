import sys
import time

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("paho-mqtt not installed, installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paho-mqtt"])
    import paho.mqtt.client as mqtt

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe("#")

def on_message(client, userdata, msg):
    print(f"Topic: {msg.topic} | Payload: {msg.payload[:200]}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print("Connecting to 192.168.1.103:1883...")
client.connect("192.168.1.103", 1883, 60)

# Run for 15 seconds
client.loop_start()
time.sleep(15)
client.loop_stop()
print("Finished listening.")
