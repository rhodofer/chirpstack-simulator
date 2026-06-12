import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def login_and_setup(page: Page):
    # Ensure session cookies are cleared before each test
    page.context.clear_cookies()
    
    # Standard login flow before settings test
    page.goto("http://localhost:9002")
    page.fill("#login-username", "admin@falt.com")
    page.fill("#login-password", "admin123")
    page.click("#btn-login-submit")
    expect(page.locator("#login-overlay")).not_to_be_visible()
    yield

def test_navigate_settings_tabs(page: Page):
    # Click settings tab in main sidebar
    page.click("[data-tab='settings']")
    expect(page.locator("#content-settings")).to_be_visible()
    
    # Click Connections Settings sub-tab
    page.click("[data-settings-tab='connections']")
    expect(page.locator("#settings-sub-connections")).to_be_visible()
    expect(page.locator("#conn-api-server")).to_be_visible()
    
    # Click General Settings sub-tab
    page.click("[data-settings-tab='general']")
    expect(page.locator("#settings-sub-general")).to_be_visible()
    expect(page.locator("#packet_loss")).to_be_visible()

def test_settings_validation_limits(page: Page):
    # Go to settings tab
    page.click("[data-tab='settings']")
    page.click("[data-settings-tab='general']")
    
    # Input boundary/exceeded values
    page.check("#simulate_packet_loss")
    page.fill("#packet_loss", "150")  # Capped at 100%
    page.fill("#latency_ms", "7000")  # Capped at 5000ms
    
    # Save general settings
    page.click("#btn-save-general-settings")
    
    # Wait for success toast/notification
    expect(page.locator("#toast")).to_be_visible()
    expect(page.locator("#toast")).to_contain_text("Ayarlar başarıyla kaydedildi")
    
    # Reload page to fetch from SQLite database and verify clamping values
    page.reload()
    
    # Go back to general settings tab
    page.click("[data-tab='settings']")
    page.click("[data-settings-tab='general']")
    
    # Verify values have been clamped by backend validation
    expect(page.locator("#packet_loss")).to_have_value("100")
    expect(page.locator("#latency_ms")).to_have_value("5000")

def test_email_reporting_settings(page: Page):
    # Go to settings tab
    page.click("[data-tab='settings']")
    expect(page.locator("#content-settings")).to_be_visible()

    # Click Email Reporting sub-tab
    page.click("[data-settings-tab='email']")
    expect(page.locator("#settings-sub-email")).to_be_visible()
    expect(page.locator("#smtp-enabled-badge")).to_be_visible()
    expect(page.locator("#btn-test-smtp")).to_be_visible()

    # Mock the test-email API endpoint to return a success response
    page.route("**/api/system/test-email", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"status":"delivered"}'
    ))

    # Click test email button and verify success message
    page.click("#btn-test-smtp")
    expect(page.locator("#smtp-test-status")).to_be_visible()
    expect(page.locator("#smtp-test-status")).to_contain_text("teslim edildi")

    # Mock the test-email API to return a connection error (firewall/UFW check simulation)
    page.route("**/api/system/test-email", lambda route: route.fulfill(
        status=500,
        content_type="application/json",
        body='{"error":"connection timeout to smtp.gmail.com:587"}'
    ))

    # Click test email button and verify failure message propagation
    page.click("#btn-test-smtp")
    expect(page.locator("#smtp-test-status")).to_contain_text("Hata")
