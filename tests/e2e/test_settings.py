import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def login_and_setup(page: Page):
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
