import sqlite3
import urllib.request
import json

cookie_header = "sim_session=sim-secure-session-token-xyz"

def get_api(path):
    url = f"http://127.0.0.1:9002{path}"
    req = urllib.request.Request(url)
    req.add_header("Cookie", cookie_header)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return json.loads(res.read().decode())
    except Exception as e:
        print(f"Error fetching API path {path}: {e}")
        return None

def main():
    # 1. Read SQLite Configurations
    try:
        conn = sqlite3.connect("simulator.db")
        cursor = conn.cursor()
        cursor.execute("SELECT tenant_id, device_count, gateway_count, app_name, device_prefix FROM org_configs")
        configs = cursor.fetchall()
        conn.close()
    except Exception as e:
        print(f"Error reading sqlite database: {e}")
        return

    print("=== SIMULATOR CONFIGURATIONS (from local SQLite db) ===")
    config_map = {}
    for cfg in configs:
        tid, dev_count, gw_count, app_name, prefix = cfg
        print(f"Tenant: {tid}")
        print(f"  - App Name: {app_name}")
        print(f"  - Target Devices: {dev_count}")
        print(f"  - Target Gateways: {gw_count}")
        print(f"  - Device Prefix: {prefix}")
        config_map[tid] = {
            "app_name": app_name,
            "dev_count": dev_count,
            "gw_count": gw_count,
            "prefix": prefix
        }

    # 2. Query Live ChirpStack status via Simulator proxy API
    print("\n=== LIVE CHIRPSTACK STATE (via Simulator Proxy API) ===")
    
    # Tenants
    tenants_data = get_api("/api/organizations")
    if not tenants_data:
        print("Could not retrieve organizations.")
        return
    orgs = tenants_data.get("organizations", [])
    print(f"Total Tenants: {len(orgs)}")
    for org in orgs:
        print(f"  - Tenant ID: {org['id']}, Name: {org['name']}")
    
    # Gateways
    gws_data = get_api("/api/gateways")
    gws = gws_data.get("gateways", []) if gws_data else []
    print(f"Total Gateways: {len(gws)}")
    for gw in gws:
        print(f"  - Gateway EUI: {gw['id']}, Name: {gw['name']}, Tenant: {gw['tenant_id']}")

    # Applications
    apps_data = get_api("/api/applications")
    apps = apps_data.get("applications", []) if apps_data else []
    print(f"Total Applications: {len(apps)}")
    for app in apps:
        print(f"  - App ID: {app['id']}, Name: {app['name']}, Tenant: {app['tenant_id']}")

    # Device Profiles
    dp_data = get_api("/api/device-profiles")
    dps = dp_data.get("device_profiles", []) if dp_data else []
    print(f"Total Device Profiles: {len(dps)}")
    for dp in dps:
        print(f"  - Profile ID: {dp['id']}, Name: {dp['name']}, Tenant: {dp['tenant_id']}")

    # Devices
    devs_data = get_api("/api/devices?limit=1000")
    devs = devs_data.get("devices", []) if devs_data else []
    print(f"Total Devices: {len(devs)}")
    for dev in devs:
        print(f"  - Device EUI: {dev['dev_eui']}, Name: {dev['name']}, App ID: {dev['application_id']}, Profile ID: {dev['device_profile_id']}")

    # 3. Check alignment
    print("\n=== ALIGNMENT ASSESSMENT ===")
    for tid, target in config_map.items():
        print(f"Checking Tenant ID: {tid}...")
        
        # Check tenant exists
        tenant_exists = any(org['id'] == tid for org in orgs)
        print(f"  * Tenant exists in ChirpStack: {'YES' if tenant_exists else 'NO'}")
        
        # Check gateways count
        tenant_gws = [gw for gw in gws if gw['tenant_id'] == tid]
        print(f"  * Gateways: Live count = {len(tenant_gws)} | Target = {target['gw_count']}")
        
        # Check app exists
        tenant_apps = [app for app in apps if app['tenant_id'] == tid and app['name'] == target['app_name']]
        print(f"  * Application '{target['app_name']}' exists: {'YES' if tenant_apps else 'NO'}")
        
        # Check devices count & prefix
        if tenant_apps:
            app_id = tenant_apps[0]['id']
            app_devs = [dev for dev in devs if dev['application_id'] == app_id]
            matching_prefix_count = sum(1 for dev in app_devs if dev['name'].startswith(target['prefix']))
            print(f"  * Devices: Live count = {len(app_devs)} | Target = {target['dev_count']}")
            print(f"  * Devices matching prefix '{target['prefix']}': {matching_prefix_count}/{len(app_devs)}")
            if len(app_devs) == target['dev_count'] and matching_prefix_count == len(app_devs):
                print("  => Result: FULLY ALIGNED")
            else:
                print("  => Result: MISALIGNED OR NOT FULLY PROVISIONED")
        else:
            print("  => Result: APPLICATION NOT FOUND")

if __name__ == '__main__':
    main()
