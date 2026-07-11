import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    deviceScaleFactor: 2,
    recordVideo: {
      dir: 'videos/',
      size: { width: 375, height: 812 }
    }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173');

  // Wait for animation to load and settle a bit
  await page.waitForTimeout(10000); // 10 seconds to let the icons arrive to grid

  await page.screenshot({ path: 'mobile-view.png', fullPage: true });

  await browser.close();
  console.log('Done!');
})();
