import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def setup_login(page: Page):
    # Clear cookies and log in before each test
    page.context.clear_cookies()
    page.goto("http://localhost:9002")
    
    page.fill("#login-username", "admin@falt.com")
    page.fill("#login-password", "admin123")
    page.click("#btn-login-submit")
    expect(page.locator("#login-overlay")).not_to_be_visible()
    yield

def test_log_center_navigation_and_tabs(page: Page):
    page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
    # Navigate to Log Center
    page.click('.secondary-nav-link[data-tab="log-center"]')
    
    # Verify page visibility and title
    expect(page.locator("#content-log-center")).to_be_visible()
    expect(page.locator("#content-log-center h1.page-title")).to_contain_text("Log")
    
    # Verify System Events panel is active by default
    expect(page.locator("#log-panel-system")).to_be_visible()
    expect(page.locator("#log-panel-console")).not_to_be_visible()
    
    # Toggle to Live Console panel
    page.click('.log-tab-btn[data-log-tab="console"]')
    expect(page.locator("#log-panel-console")).to_be_visible()
    expect(page.locator("#log-panel-system")).not_to_be_visible()
    
    # Toggle back to System Events panel
    page.click('.log-tab-btn[data-log-tab="system"]')
    expect(page.locator("#log-panel-system")).to_be_visible()
    expect(page.locator("#log-panel-console")).not_to_be_visible()

def test_log_center_system_filtering_and_clear(page: Page):
    # Navigate to Log Center
    page.click('.secondary-nav-link[data-tab="log-center"]')
    
    # Verify that the system logs container is visible
    expect(page.locator("#log-container")).to_be_visible()
    
    # Test typing in search input
    page.fill("#sys-log-search-input", "connection")
    
    # Test filtering by level selector
    page.select_option("#sys-log-level-select", "success")
    
    # Handle the clear confirmation dialog automatically
    def handle_dialog(dialog):
        # Verify the dialog text content is localized
        assert "silmek istediğinize emin misiniz?" in dialog.message or "clear all system logs?" in dialog.message
        dialog.dismiss()
        
    page.on("dialog", handle_dialog)
    page.click("#btn-sys-log-clear")
