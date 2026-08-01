const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // Test logged in state
  const contextAuth = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [
            {
              name: 'sb-dummy-auth-token',
              value: JSON.stringify({
                access_token: 'dummy_access_token',
                refresh_token: 'dummy_refresh_token',
                user: {
                  id: 'dummy_user_id',
                  email: 'test@example.com'
                }
              })
            }
          ]
        }
      ]
    }
  });

  const pageAuth = await contextAuth.newPage();

  await pageAuth.route('**/auth/v1/user', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'dummy_user_id', email: 'test@example.com' })
  }));

  await pageAuth.route('**/rest/v1/profiles?*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 'dummy_user_id', name: 'Test User', avatar_url: null, student_class: '10' }])
  }));

  // Wait to pick up the mocked routes
  await pageAuth.goto('http://localhost:5173');
  await pageAuth.evaluate(() => {
    localStorage.setItem('sb-dummy-auth-token', JSON.stringify({
      access_token: 'dummy_access_token',
      refresh_token: 'dummy_refresh_token',
      user: {
        id: 'dummy_user_id',
        email: 'test@example.com'
      }
    }));
  });

  await pageAuth.goto('http://localhost:5173');
  await pageAuth.waitForTimeout(2000);

  // Take screenshot of the state just to debug
  await pageAuth.screenshot({ path: 'debug_auth_before_click_2.png' });

  await pageAuth.evaluate(() => window.scrollBy(0, 1000));
  await pageAuth.waitForTimeout(500);

  await pageAuth.waitForSelector('button[aria-label="Open menu"]');
  await pageAuth.click('button[aria-label="Open menu"]', { force: true });
  await pageAuth.waitForTimeout(2000);
  await pageAuth.screenshot({ path: 'mobile_auth_menu_6.png' });
  await contextAuth.close();

  await browser.close();
})();
