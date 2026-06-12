import re
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def login_and_setup(page: Page):
    # Capture and print browser console logs for debugging
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    
    # Standard login flow
    page.goto("http://localhost:9002")
    page.fill("#login-username", "admin@falt.com")
    page.fill("#login-password", "admin123")
    page.click("#btn-login-submit")
    expect(page.locator("#login-overlay")).not_to_be_visible()
    yield

def test_network_application_wizard(page: Page):
    # Navigate to Network Applications tab
    page.click("[data-tab='networks']")
    expect(page.locator("#content-networks")).to_be_visible()
    
    # Click "+ Yeni Uygulama" button
    page.click("#btn-add-net")
    expect(page.locator("#net-modal-overlay")).to_be_visible()
    
    # Step 1: Organization select validation
    expect(page.locator("#net-wiz-btn-next")).to_be_disabled()
    
    # Select an organization from dropdown (skip the default placeholder)
    page.select_option("#net-wiz-tenant", index=1)
    expect(page.locator("#net-wiz-btn-next")).to_be_enabled()
    
    # Click Next to Step 2
    page.click("#net-wiz-btn-next")
    expect(page.locator("#net-wiz-pane-2")).to_be_visible()
    expect(page.locator("#net-wiz-btn-next")).to_be_disabled()
    
    # Fill application name
    page.fill("#net-wiz-name", "E2E Test Network Application")
    page.fill("#net-wiz-prefix", "e2e-net-app-desc")
    expect(page.locator("#net-wiz-btn-next")).to_be_enabled()
    
    # Click Next to Step 3 (Summary)
    page.click("#net-wiz-btn-next")
    expect(page.locator("#net-wiz-pane-3")).to_be_visible()
    expect(page.locator("#net-summary-org-name")).not_to_be_empty()
    expect(page.locator("#net-summary-app-name")).to_have_text("E2E Test Network Application")
    expect(page.locator("#net-summary-prefix")).to_have_text("e2e-net-app-desc")
    
    # Click Confirm & Create
    page.click("#net-wiz-btn-next")
    
    # Wait for success toast and modal overlay to hide
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#toast")).to_contain_text("oluşturuldu")
    expect(page.locator("#net-modal-overlay")).not_to_be_visible()


def test_device_profile_wizard(page: Page):
    # Navigate to Device Profiles tab
    page.click("[data-tab='devices']")
    expect(page.locator("#content-devices")).to_be_visible()
    
    # Click "+ Yeni Profil" button
    page.click("#btn-add-dp")
    expect(page.locator("#dp-modal-overlay")).to_be_visible()
    
    # Step 1: Validation checks (initially disabled because no name/tenant)
    expect(page.locator("#dp-wiz-btn-next")).to_be_disabled()
    
    # Select organization
    page.select_option("#dp-tenant", index=1)
    # Fill profile name
    page.fill("#dp-name", "E2E Test Device Profile")
    page.fill("#dp-description", "E2E Test Device Profile Description")
    
    # Verify validation passes
    expect(page.locator("#dp-wiz-btn-next")).to_be_enabled()
    
    # Click Next to Step 2
    page.click("#dp-wiz-btn-next")
    expect(page.locator("#dp-wiz-pane-2")).to_be_visible()
    
    # Check Class C support checkbox
    page.check("#dp-supports-class-c")
    
    # Click Next to Step 3 (Summary)
    page.click("#dp-wiz-btn-next")
    expect(page.locator("#dp-wiz-pane-3")).to_be_visible()
    expect(page.locator("#dp-summary-org-name")).not_to_be_empty()
    expect(page.locator("#dp-summary-name")).to_have_text("E2E Test Device Profile")
    expect(page.locator("#dp-summary-activation")).to_have_text("OTAA")
    expect(page.locator("#dp-summary-classes")).to_contain_text("Class C")
    
    # Click Confirm & Create
    page.click("#dp-wiz-btn-next")
    
    # Wait for success toast and modal overlay to hide
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#toast")).to_contain_text("oluşturuldu")
    expect(page.locator("#dp-modal-overlay")).not_to_be_visible()
def test_bootstrap_wizard(page: Page):
    # Click "Yeni Oluştur" in top bar
    page.click("#btn-top-bootstrap")
    expect(page.locator("#bootstrap-modal-overlay")).to_be_visible()
    
    # Step 1: Org Name and Preset
    page.fill("#wiz-org-name", "E2E-Bootstrap-Org")
    page.click("#wiz-btn-next")
    
    # Step 2: Networks
    expect(page.locator("#wiz-pane-2")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-app-prefix", "e2e-app")
    page.fill("#wiz-app-count", "2")
    expect(page.locator("#wiz-app-count")).to_have_value("2")
    page.click("#wiz-btn-next")
    
    # Step 3: Device Profiles
    expect(page.locator("#wiz-pane-3")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-dp-prefix", "e2e-dp")
    page.fill("#wiz-dp-count", "2")
    expect(page.locator("#wiz-dp-count")).to_have_value("2")
    page.click("#wiz-btn-next")
    
    # Step 4: Devices
    expect(page.locator("#wiz-pane-4")).to_be_visible()
    page.wait_for_timeout(200) # Wait for autofocus shift
    page.fill("#wiz-dev-prefix", "e2e-dev")
    page.fill("#wiz-dev-count", "3")
    expect(page.locator("#wiz-dev-count")).to_have_value("3")
    page.click("#wiz-btn-next")
    
    # Step 5: Summary
    expect(page.locator("#wiz-pane-5")).to_be_visible()
    expect(page.locator("#wiz-summary-org")).to_have_text("E2E-Bootstrap-Org")
    expect(page.locator("#wiz-summary-apps")).to_have_text("2")
    expect(page.locator("#wiz-summary-profiles")).to_have_text("2")
    page.click("#wiz-btn-next")
    
    # Step 6: Success
    expect(page.locator("#wiz-pane-6")).to_be_visible()
    expect(page.locator("#wiz-success-org")).to_have_text("E2E-Bootstrap-Org")
    
    # Close wizard
    page.click("#wiz-btn-next")
    expect(page.locator("#bootstrap-modal-overlay")).not_to_be_visible()

def test_edit_network_application(page: Page):
    # Navigate to Network Applications tab
    page.click("[data-tab='networks']")
    expect(page.locator("#content-networks")).to_be_visible()

    # Find the row we created in test_network_application_wizard and click Edit (✏)
    app_row = page.locator("#net-table-body tr").filter(has_text="E2E Test Network Application").first
    expect(app_row).to_be_visible()
    app_row.locator(".edit-btn").click()

    # Verify that details drawer is opened with correct information
    expect(page.locator("#details-drawer")).to_have_class(re.compile(r"\bopen\b"))
    expect(page.locator("#edit-app-name-input")).to_have_value("E2E Test Network Application")

    # Edit name and description
    page.fill("#edit-app-name-input", "E2E Test Network Application Edited")
    page.fill("#edit-app-desc-input", "E2E Edited Description")

    # Click Update button
    page.click("#btn-save-app-name")

    # Verify success toast
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#toast")).to_contain_text("güncellendi")

    # Verify details drawer closes automatically
    expect(page.locator("#details-drawer")).not_to_have_class(re.compile(r"\bopen\b"))

    # Search for the edited name to handle pagination/sorting shifts
    page.fill("#net-search-input", "E2E Test Network Application Edited")
    page.wait_for_timeout(300) # Wait for filtering to apply

    # Verify table row reflects the updated name
    expect(page.locator("#net-table-body tr").filter(has_text="E2E Test Network Application Edited").first).to_be_visible()



