from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1200, 'height': 800},
            device_scale_factor=2
        )
        page = context.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')

        # Initial desktop screenshot
        page.screenshot(path='/home/jules/verification/desktop_initial_fixed.png')

        # Click library and wait for animation
        page.click("text=Library")
        time.sleep(0.5)
        page.screenshot(path='/home/jules/verification/desktop_active_library_fixed.png')

        browser.close()

if __name__ == "__main__":
    verify_frontend()
