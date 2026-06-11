import sys
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console events
        def on_console(msg):
            print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}")
        page.on("console", on_console)

        # Listen to network events
        def on_request(request):
            if "api" in request.url:
                print(f"[NETWORK REQ] {request.method} {request.url}")
        page.on("request", on_request)

        def on_response(response):
            if "api" in response.url:
                print(f"[NETWORK RESP] {response.status} {response.url}")
                if "start" in response.url or "status" in response.url or "bootstrap" in response.url:
                    try:
                        print(f"  -> Body: {response.text()}")
                    except Exception as e:
                        print(f"  -> Failed to read body: {e}")
        page.on("response", on_response)

        print("Navigating to localhost:9002...")
        page.goto("http://localhost:9002")

        # Login
        page.fill("#login-username", "admin@falt.com")
        page.fill("#login-password", "admin123")
        page.click("#btn-login-submit")
        page.wait_for_timeout(1500)

        # Start setup via Bootstrap Wizard
        print("Opening Bootstrap Wizard...")
        page.click("#btn-top-bootstrap")
        page.wait_for_timeout(500)

        # Step 1: Org Name
        page.fill("#wiz-org-name", "E2E-Debug-Org")
        page.click("#wiz-btn-next")
        page.wait_for_timeout(500)

        # Step 2: Networks
        page.fill("#wiz-app-prefix", "flow-app")
        page.fill("#wiz-app-count", "1")
        page.click("#wiz-btn-next")
        page.wait_for_timeout(500)

        # Step 3: Device Profiles
        page.fill("#wiz-dp-prefix", "flow-dp")
        page.fill("#wiz-dp-count", "1")
        page.click("#wiz-btn-next")
        page.wait_for_timeout(500)

        # Step 4: Devices
        page.fill("#wiz-dev-prefix", "flow-dev")
        page.fill("#wiz-dev-count", "1")
        page.click("#wiz-btn-next")
        page.wait_for_timeout(500)

        # Step 5: Summary
        page.click("#wiz-btn-next")
        page.wait_for_timeout(1000)

        # Step 6: Success
        page.click("#wiz-btn-next")
        page.wait_for_timeout(1000)
        
        print("Wizard finished. Status badge text:", page.locator("#status-badge").text_content())

        # Check DOM values
        tenant_input_val = page.locator("#tenant_id").input_value()
        app_name_val = page.locator("#app_name").input_value()
        device_prefix_val = page.locator("#device_prefix").input_value()
        toast_text = page.locator("#toast").text_content() if page.locator("#toast").is_visible() else "No toast"

        print(f"DEBUG - tenant_id field value: {tenant_input_val}")
        print(f"DEBUG - app_name field value: {app_name_val}")
        print(f"DEBUG - device_prefix field value: {device_prefix_val}")
        print(f"DEBUG - active toast message: {toast_text}")

        # Check if Start button is disabled
        btn_start = page.locator("#btn-top-start")
        print("Is start button disabled?", btn_start.is_disabled())

        # Try to start simulation
        print("Clicking Start button...")
        page.click("#btn-top-start")
        
        # Wait a bit for status to update
        for i in range(5):
            page.wait_for_timeout(1000)
            status = page.locator("#status-badge").text_content()
            toast_text = page.locator("#toast").text_content() if page.locator("#toast").is_visible() else "No toast"
            print(f"Polling status (attempt {i}): {status} | Toast: {toast_text}")
            if "RUNNING" in status:
                break
        
        browser.close()

if __name__ == "__main__":
    run()
