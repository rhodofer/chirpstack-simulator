import grpc
import sys

host = 'api-chirpstack.iofeteknoloji.com'
token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjaGlycHN0YWNrIiwiaXNzIjoiY2hpcnBzdGFjayIsInN1YiI6Ijc0MDgwZTJhLTdhN2MtNDkxMi04NDVhLTM4ZGY0M2IxNDk1MyIsInR5cCI6ImtleSJ9.sj4TGI6PQ8iFe7j_YiE8_gVSU_IcmdDjaEdNwzekBac'

print("Trying port 80 (insecure)...")
try:
    channel = grpc.insecure_channel(f"{host}:80")
    grpc.channel_ready_future(channel).result(timeout=5)
    print("Port 80 channel is ready!")
except Exception as e:
    print("Port 80 failed:", e)

print("Trying port 443 (secure)...")
try:
    channel = grpc.secure_channel(f"{host}:443", grpc.ssl_channel_credentials())
    grpc.channel_ready_future(channel).result(timeout=5)
    print("Port 443 channel is ready!")
except Exception as e:
    print("Port 443 failed:", e)
