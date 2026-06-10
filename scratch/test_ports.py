import socket

hosts = ['chirpstack.iofeteknoloji.com', 'api-chirpstack.iofeteknoloji.com']
ports = [80, 443, 1883, 8883, 8080]

print(f"{'Host':<40} | {'Port':<6} | {'Status':<10}")
print("-" * 62)

for host in hosts:
    for port in ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)  # 3 seconds timeout
        try:
            s.connect((host, port))
            print(f"{host:<40} | {port:<6} | SUCCESS")
            s.close()
        except socket.timeout:
            print(f"{host:<40} | {port:<6} | TIMEOUT")
        except Exception as e:
            print(f"{host:<40} | {port:<6} | FAILED ({type(e).__name__})")
