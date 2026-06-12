import socket
import sys
import subprocess
import time
import os
import shutil

def is_port_open(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        s.connect((host, port))
        s.close()
        return True
    except:
        return False

def run_command(args):
    print(f"Running command: {' '.join(args)}")
    subprocess.run(args, check=True)

def cleanup_e2e_organizations():
    import urllib.request
    import urllib.error
    import json
    
    url = "http://localhost:9002"
    
    # 1. Login to get cookie
    login_url = f"{url}/api/auth/login"
    login_data = json.dumps({"username": "admin@falt.com", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            cookie = response.info().get('Set-Cookie')
            if not cookie:
                print("Could not get session cookie for cleanup")
                return
    except Exception as e:
        print(f"Cleanup login failed: {e}")
        return

    # Extract sim_session cookie
    sim_cookie = None
    if cookie:
        for part in cookie.split(';'):
            if 'sim_session=' in part:
                sim_cookie = part.strip()
                break
            
    if not sim_cookie:
        print("Could not parse sim_session cookie")
        return

    # 2. Get organizations list
    orgs_url = f"{url}/api/organizations?limit=100"
    req = urllib.request.Request(orgs_url, headers={'Cookie': sim_cookie})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            orgs = data.get("organizations", [])
    except Exception as e:
        print(f"Failed to fetch organizations for cleanup: {e}")
        return

    # 3. Delete E2E organizations
    deleted_count = 0
    for org in orgs:
        name = org.get("name", "")
        if name.startswith("E2E-"):
            org_id = org.get("id")
            delete_url = f"{url}/api/organizations/{org_id}"
            req = urllib.request.Request(delete_url, method='DELETE', headers={'Cookie': sim_cookie})
            try:
                with urllib.request.urlopen(req) as response:
                    if response.status == 200:
                        print(f"Deleted E2E organization: {name} ({org_id})")
                        deleted_count += 1
            except Exception as e:
                print(f"Failed to delete E2E organization {name}: {e}")
                
    if deleted_count > 0:
        print(f"Cleaned up {deleted_count} E2E organizations from ChirpStack.")

def main():
    target_host = "localhost"
    target_port = 9002
    
    db_path = "simulator.db"
    db_bak_path = "simulator.db.bak"
    
    db_existed = os.path.exists(db_path)
    
    if db_existed:
        print(f"Backing up existing database {db_path} to {db_bak_path}...")
        shutil.copy2(db_path, db_bak_path)
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Warning: could not remove database: {e}")
            # Try to truncate it
            with open(db_path, "w") as f:
                f.truncate(0)

    # Clean up journal/wal files if they exist to prevent corruption or state carryover
    for ext in ["-journal", "-wal", "-shm"]:
        extra_file = db_path + ext
        if os.path.exists(extra_file):
            try:
                os.remove(extra_file)
            except Exception as e:
                print(f"Warning: could not remove {extra_file}: {e}")

    print("Restarting ChirpStack Simulator container to initialize a fresh test database...")
    try:
        run_command(["docker-compose", "restart", "chirpstack-simulator"])
    except Exception as e:
        print(f"Error restarting container: {e}")
        # If we failed, restore database and exit
        if db_existed and os.path.exists(db_bak_path):
            shutil.copy2(db_bak_path, db_path)
            os.remove(db_bak_path)
        sys.exit(1)

    print("Waiting for simulator port 9002 to become active...")
    port_ready = False
    for _ in range(30):
        if is_port_open(target_host, target_port):
            port_ready = True
            break
        time.sleep(1)
        
    if not port_ready:
        print("[ERROR] Simulator failed to start on port 9002 after container restart.")
        # Restore db and exit
        if db_existed and os.path.exists(db_bak_path):
            shutil.copy2(db_bak_path, db_path)
            os.remove(db_bak_path)
        sys.exit(1)
        
    # Wait for the HTTP server inside the container to be fully ready and serving
    print("Waiting for HTTP server to respond on port 9002...")
    import urllib.request
    for i in range(15):
        try:
            req = urllib.request.Request(f"http://{target_host}:{target_port}/")
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    break
        except Exception as e:
            # urllib might throw HTTPError or URLError, but we just need a response
            if "HTTPError" in type(e).__name__ or hasattr(e, 'code'):
                break
        time.sleep(1)

    # Wait another 2 seconds for gRPC connections to stabilize
    time.sleep(2)

    # Clean up any leftover E2E organizations in ChirpStack before running tests
    print("Pre-test cleanup: checking for leftover E2E organizations...")
    try:
        cleanup_e2e_organizations()
    except Exception as e:
        print(f"Warning: Pre-test cleanup failed: {e}")

    print("Simulator is active on a fresh test database. Running E2E tests...\n")
    
    cmd = [sys.executable, "-m", "pytest", "tests/e2e/", "-v"]
    if "--headed" in sys.argv:
        cmd.append("--headed")
        
    return_code = 0
    try:
        res = subprocess.run(cmd)
        return_code = res.returncode
    except Exception as e:
        print(f"Error running pytest: {e}")
        return_code = 1
    finally:
        print("\nCleaning up E2E organizations from ChirpStack...")
        try:
            cleanup_e2e_organizations()
        except Exception as e:
            print(f"Warning: E2E cleanup failed: {e}")
            
        print("\nRestoring original database state...")
        # Clean up any test database and extra files
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception as e:
                print(f"Warning: could not remove test database: {e}")
        for ext in ["-journal", "-wal", "-shm"]:
            extra_file = db_path + ext
            if os.path.exists(extra_file):
                try:
                    os.remove(extra_file)
                except:
                    pass

        # Restore original database
        if db_existed and os.path.exists(db_bak_path):
            print(f"Restoring database from {db_bak_path}...")
            shutil.copy2(db_bak_path, db_path)
            os.remove(db_bak_path)
            
        print("Restarting ChirpStack Simulator container to reload the original database...")
        try:
            run_command(["docker-compose", "restart", "chirpstack-simulator"])
        except Exception as e:
            print(f"Warning: failed to restart container during cleanup: {e}")
            
        print("Waiting for simulator port 9002 to become active after restore...")
        for _ in range(30):
            if is_port_open(target_host, target_port):
                break
            time.sleep(1)
            
        print("Cleanup completed successfully.")
        sys.exit(return_code)

if __name__ == "__main__":
    main()

