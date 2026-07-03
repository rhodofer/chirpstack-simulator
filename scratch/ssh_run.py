import paramiko
import sys

def try_ssh(host, username, password, command):
    print(f"Trying SSH connection to {host} with username '{username}'...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=username, password=password, timeout=10)
        print("Connection successful!")
        stdin, stdout, stderr = ssh.exec_command(command)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print("STDOUT:")
        print(out)
        print("STDERR:")
        print(err)
        ssh.close()
        return True
    except Exception as e:
        print(f"Failed with username '{username}' and password '{password}': {e}")
        ssh.close()
        return False

host = "192.168.1.116"
passwords = ["81Rhod81", "81rhod81"]
usernames = ["rhod", "vmapp"]

cmd = "docker ps -a && echo '---' && docker compose -f /home/rhod/chirpstack-simulator/docker-compose.prod.yml ps"

success = False
for user in usernames:
    for pwd in passwords:
        if try_ssh(host, user, pwd, cmd):
            success = True
            break
    if success:
        break
