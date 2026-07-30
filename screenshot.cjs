const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // Desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'videos/desktop/' }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173/library');

  // Wait a bit for everything to render
  await desktopPage.waitForTimeout(2000);

  await desktopPage.screenshot({ path: 'desktop_screenshot.png' });
  await desktopContext.close();

  // Mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    recordVideo: { dir: 'videos/mobile/' }
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/library');

  await mobilePage.waitForTimeout(2000);

  await mobilePage.screenshot({ path: 'mobile_screenshot.png' });
  await mobileContext.close();

  await browser.close();
})();
