import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def run_around_tests(page: Page):
    # Ensure session cookies are cleared before each test
    page.context.clear_cookies()
    page.goto("http://localhost:9002")
    yield

def test_login_invalid_credentials(page: Page):
    # Verify login overlay is visible initially
    expect(page.locator("#login-overlay")).to_be_visible()
    
    # Type invalid credentials
    page.fill("#login-username", "wrong@falt.com")
    page.fill("#login-password", "wrongpassword")
    
    # Submit form
    page.click("#btn-login-submit")
    
    # Verify error message is shown
    expect(page.locator("#login-error")).to_be_visible()
    expect(page.locator("#login-error")).to_contain_text("Kullanıcı adı veya şifre hatalı!")

def test_login_success(page: Page):
    # Verify login overlay is visible initially
    expect(page.locator("#login-overlay")).to_be_visible()
    
    # Type valid credentials
    page.fill("#login-username", "admin@falt.com")
    page.fill("#login-password", "admin123")
    
    # Submit form
    page.click("#btn-login-submit")
    
    # Verify login overlay is closed
    expect(page.locator("#login-overlay")).not_to_be_visible()
    
    # Verify status badge or general settings are loaded
    expect(page.locator("#status-badge")).to_be_visible()
