import socket
import sys
import subprocess
import time

def is_port_open(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        s.connect((host, port))
        s.close()
        return True
    except:
        return False

def main():
    target_host = "localhost"
    target_port = 9002
    
    print("Checking if ChirpStack Simulator is running on port 9002...")
    if not is_port_open(target_host, target_port):
        print("\n[WARNING] ChirpStack Simulator is not running on http://localhost:9002!")
        print("Please ensure the simulator is running before launching E2E tests.")
        print("You can start it using: docker-compose up -d")
        sys.exit(1)
        
    print("Simulator is active. Running Playwright E2E tests using pytest...\n")
    
    # Run pytest on the e2e folder
    cmd = [sys.executable, "-m", "pytest", "tests/e2e/", "-v"]
    # Check if headed mode is requested
    if "--headed" in sys.argv:
        cmd.append("--headed")
        
    try:
        res = subprocess.run(cmd)
        sys.exit(res.returncode)
    except FileNotFoundError:
        print("[ERROR] pytest not found. Please install dependencies: pip install pytest-playwright")
        sys.exit(1)

if __name__ == "__main__":
    main()
