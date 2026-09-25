import paramiko

ips = ["100.64.0.3", "100.64.0.2", "192.168.1.116", "192.168.1.104", "api-falt.iofeteknoloji.com"]
users = ["rhod", "vmapp", "root", "ubuntu", "admin"]
passwords = ["81Rhod81", "81rhod81", "81Rhod1981,1", "admin"]

for ip in ips:
    for u in users:
        for p in passwords:
            try:
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                ssh.connect(ip, username=u, password=p, timeout=2)
                print(f"SUCCESS! IP={ip} User={u} Pass={p}")
                stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}'")
                print(stdout.read().decode())
                ssh.close()
                exit(0)
            except Exception as e:
                pass
print("No matching SSH credentials found.")
