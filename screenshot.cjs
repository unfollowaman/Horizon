const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock Supabase to force 401 Unauthorized for protected resources
  await page.route('**/functions/v1/resource-access', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });

  // Mock learning_resources to return a protected resource
  await page.route('**/rest/v1/learning_resources*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: '123',
        title: 'Mock Note',
        resource_type: 'notes',
        storage_bucket: 'protected-resources',
        file_path: 'mock.pdf'
      }]),
    });
  });

  // Desktop screenshot
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173/view/123');
  await page.waitForTimeout(2000); // Wait for animations/renders
  await page.screenshot({ path: 'desktop-unauthorized.png' });

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:5173/view/123');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'mobile-unauthorized.png' });

  await browser.close();
})();
