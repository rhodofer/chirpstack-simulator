import socket
import ssl

ip = '46.1.21.146'
port = 443

print("Connecting to IP directly...")
try:
    s = socket.create_connection((ip, port), timeout=5)
    context = ssl._create_unverified_context()
    # wrap_socket without server_hostname means no SNI is sent
    ssl_sock = context.wrap_socket(s)
    print("SSL/TLS handshake successful.")
    cert = ssl_sock.getpeercert(binary_form=True)
    print("Certificate obtained (binary form).")
    ssl_sock.close()
except Exception as e:
    print(f"Error: {e}")
