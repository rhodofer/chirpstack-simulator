import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def login_and_setup(page: Page):
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
