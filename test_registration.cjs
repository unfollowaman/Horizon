const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test the /register page
  await page.goto('http://localhost:5173/register');

  const testEmail = `testuser_${Date.now()}@example.com`;

  // Wait for the form to load
  await page.waitForSelector('input[placeholder="Full Name"]');

  await page.fill('input[placeholder="Full Name"]', 'Test User');
  await page.fill('input[placeholder="Email"]', testEmail);
  await page.fill('input[placeholder="Password"]', 'password123');

  // Intercept the API call to mock a successful registration
  await page.route('**/auth/v1/signup*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123',
        aud: 'authenticated',
        role: 'authenticated',
        email: testEmail
      })
    });
  });

  await page.click('button[type="submit"]');

  // Check the confirmation message
  await page.waitForSelector('text=Check your email');

  const bodyText = await page.textContent('body');

  if (bodyText.includes(`We sent a verification link to ${testEmail}. Open your email and tap the verification link to activate your account.`)) {
    console.log('✅ Register page successfully displays the correct dynamic message.');
  } else {
    console.error('❌ Register page failed to display the correct dynamic message.');
    console.error('Text found instead:');
    console.error(bodyText.match(/We sent.*/) || 'None');
    process.exit(1);
  }

  // Test the HighlightsSection on the home page
  await page.goto('http://localhost:5173/');

  // Assuming HighlightsSection only shows when not authenticated, and since we mocked signup
  // we might need to clear state or just run a similar mock. Let's just mock again.

  const homeTestEmail = `home_test_${Date.now()}@example.com`;

  await page.waitForSelector('input[placeholder="Your name"]');
  await page.fill('input[placeholder="Your name"]', 'Home User');
  await page.fill('input[placeholder="Your email"]', homeTestEmail);
  await page.fill('input[placeholder="Password"]', 'password123');

  await page.route('**/auth/v1/signup*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '456',
        aud: 'authenticated',
        role: 'authenticated',
        email: homeTestEmail
      })
    });
  });

  await page.click('text=Subscribe');

  await page.waitForSelector('text=Check your email');
  const homeBodyText = await page.textContent('body');

  if (homeBodyText.includes(`We sent a verification link to ${homeTestEmail}. Open your email and tap the verification link to activate your account.`)) {
    console.log('✅ Home page successfully displays the correct dynamic message.');
  } else {
    console.error('❌ Home page failed to display the correct dynamic message.');
    process.exit(1);
  }

  await browser.close();
})();
