import os

def build():
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(script_dir, 'src')
    
    # Define files to replace
    components = {
        '{{SIDEBAR}}': os.path.join(src_dir, 'sidebar.html'),
        '{{TOPBAR}}': os.path.join(src_dir, 'topbar.html'),
        '{{TAB_OVERVIEW}}': os.path.join(src_dir, 'tabs', 'overview.html'),
        '{{TAB_LIVE_MAP}}': os.path.join(src_dir, 'tabs', 'live-map.html'),
        '{{TAB_DEVICES}}': os.path.join(src_dir, 'tabs', 'devices.html'),
        '{{TAB_NETWORKS}}': os.path.join(src_dir, 'tabs', 'networks.html'),
        '{{TAB_DEVICE_LIST}}': os.path.join(src_dir, 'tabs', 'device-list.html'),
        '{{TAB_DEVICE_STATUS}}': os.path.join(src_dir, 'tabs', 'device-status.html'),
        '{{TAB_SETTINGS}}': os.path.join(src_dir, 'tabs', 'settings.html'),
        '{{TAB_CONSOLE}}': os.path.join(src_dir, 'tabs', 'console.html'),
        '{{TAB_INFO}}': os.path.join(src_dir, 'tabs', 'info.html'),
        '{{DRAWER}}': os.path.join(src_dir, 'drawer.html'),
        '{{DP_DRAWER}}': os.path.join(src_dir, 'dp-drawer.html'),
        '{{DETAILS_DRAWER}}': os.path.join(src_dir, 'details-drawer.html'),
        '{{MODALS}}': os.path.join(src_dir, 'modals.html'),
        '{{LOGIN}}': os.path.join(src_dir, 'login.html')
    }
    
    # Read layout.html
    layout_path = os.path.join(src_dir, 'layout.html')
    if not os.path.exists(layout_path):
        print(f"Error: {layout_path} not found.")
        return
        
    with open(layout_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace placeholders
    for placeholder, file_path in components.items():
        if not os.path.exists(file_path):
            print(f"Warning: Component file {file_path} not found. Leaving placeholder.")
            continue
        with open(file_path, 'r', encoding='utf-8') as f:
            comp_content = f.read()
        content = content.replace(placeholder, comp_content)
        
    # Write index.html
    output_path = os.path.join(script_dir, 'index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Build successful: index.html generated successfully.")

if __name__ == '__main__':
    build()
