import socket

host = 'chirpstack.iofeteknoloji.com'
ports = [80, 443, 1883, 8080, 8088, 9000, 9002, 3000, 50051, 8000, 8090, 8883]

print(f"{'Host':<30} | {'Port':<6} | {'Status':<10}")
print("-" * 52)

for port in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.0)
    try:
        s.connect((host, port))
        print(f"{host:<30} | {port:<6} | SUCCESS")
        s.close()
    except socket.timeout:
        print(f"{host:<30} | {port:<6} | TIMEOUT")
    except Exception as e:
        print(f"{host:<30} | {port:<6} | FAILED ({type(e).__name__})")
