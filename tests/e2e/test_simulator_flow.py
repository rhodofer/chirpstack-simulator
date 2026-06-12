import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def login_and_setup(page: Page):
    # Ensure session cookies are cleared before each test
    page.context.clear_cookies()
    
    page.goto("http://localhost:9002")
    page.fill("#login-username", "admin@falt.com")
    page.fill("#login-password", "admin123")
    page.click("#btn-login-submit")
    expect(page.locator("#login-overlay")).not_to_be_visible()
    yield

def test_simulator_flow_and_interval_update(page: Page):
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))
    # 1. Run Bootstrap Wizard to create a dummy organization and device
    page.click("#btn-top-bootstrap")
    expect(page.locator("#bootstrap-modal-overlay")).to_be_visible()
    
    # Step 1: Org Name
    page.fill("#wiz-org-name", "E2E-Simulator-Flow-Org")
    page.click("#wiz-btn-next")    
    
    # Step 2: Networks (1 application)
    expect(page.locator("#wiz-pane-2")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-app-prefix", "flow-app")
    page.fill("#wiz-app-count", "1")
    expect(page.locator("#wiz-app-count")).to_have_value("1")
    page.click("#wiz-btn-next")
    
    # Step 3: Device Profiles (1 profile)
    expect(page.locator("#wiz-pane-3")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-dp-prefix", "flow-dp")
    page.fill("#wiz-dp-count", "1")
    expect(page.locator("#wiz-dp-count")).to_have_value("1")
    page.click("#wiz-btn-next")
    
    # Step 4: Devices (1 device)
    expect(page.locator("#wiz-pane-4")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-dev-prefix", "flow-dev")
    page.fill("#wiz-dev-count", "1")
    expect(page.locator("#wiz-dev-count")).to_have_value("1")
    page.click("#wiz-btn-next")    # Step 5: Summary
    expect(page.locator("#wiz-pane-5")).to_be_visible()
    expect(page.locator("#wiz-summary-org")).to_have_text("E2E-Simulator-Flow-Org")
    page.click("#wiz-btn-next")
    
    # Step 6: Success
    expect(page.locator("#wiz-pane-6")).to_be_visible()
    expect(page.locator("#wiz-success-org")).to_have_text("E2E-Simulator-Flow-Org")
    page.click("#wiz-btn-next")
    expect(page.locator("#bootstrap-modal-overlay")).not_to_be_visible()

    # 2. Start the simulation
    expect(page.locator("#status-badge")).to_contain_text("IDLE")
    page.click("#btn-top-start")
    
    # Verify status changes to RUNNING
    expect(page.locator("#status-badge")).to_contain_text("RUNNING", timeout=10000)

    # 3. Navigate to Devices tab to update interval
    page.click("[data-tab='device-list']")
    expect(page.locator("#content-device-list")).to_be_visible()

    # Locate the interval select dropdown and change it
    interval_select = page.locator(".dev-table-interval-select").first
    expect(interval_select).to_have_value("2m")
    
    # Select "4m" to trigger interval update and simulator auto-restart
    interval_select.select_option("4m")

    # 4. Assert loading overlay hides and toast indicates restart success
    expect(page.locator("#loading-lock-overlay")).not_to_be_visible(timeout=15000)
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#toast")).to_contain_text("yeniden başlatıldı")

    # Verify simulation is still running after auto-restart
    expect(page.locator("#status-badge")).to_contain_text("RUNNING")

    # 5. Stop the simulation
    page.click("#btn-top-stop")
    expect(page.locator("#status-badge")).to_contain_text("IDLE", timeout=10000)
