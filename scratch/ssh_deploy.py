import paramiko

host = "192.168.1.116"
username = "rhod"
password = "81Rhod81"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(host, username=username, password=password, timeout=10)
    print("Connected successfully to target server.")

    # Read existing compose file on the server
    stdin, stdout, stderr = ssh.exec_command("cat /home/rhod/chirpstack-simulator/docker-compose.prod.yml")
    compose_content = stdout.read().decode('utf-8')
    
    # Replace 9001:9001 with 9003:9001 if present
    if "9001:9001" in compose_content:
        new_content = compose_content.replace("9001:9001", "9003:9001")
        
        # Write back to the server
        sftp = ssh.open_sftp()
        f = sftp.file("/home/rhod/chirpstack-simulator/docker-compose.prod.yml", "w")
        f.write(new_content)
        f.close()
        sftp.close()
        print("Updated docker-compose.prod.yml on remote server.")
    else:
        print("docker-compose.prod.yml on remote server is already updated or does not contain 9001:9001.")

    # Re-run docker compose up -d
    print("Running 'docker compose up -d' on remote server...")
    stdin, stdout, stderr = ssh.exec_command("cd /home/rhod/chirpstack-simulator && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("STDOUT:")
    print(out)
    print("STDERR:")
    print(err)

    # Check status
    stdin, stdout, stderr = ssh.exec_command("docker ps")
    print("Active containers on VM:")
    print(stdout.read().decode('utf-8'))

    ssh.close()
except Exception as e:
    print(f"SSH execution failed: {e}")
