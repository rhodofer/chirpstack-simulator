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
        
    # Wait another 2 seconds for gRPC connections to stabilize
    time.sleep(2)

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

