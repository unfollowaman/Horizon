import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();

  // Desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173/library');

  // Wait for dropdowns
  await desktopPage.waitForSelector('text=PYQ Papers');
  await desktopPage.waitForTimeout(2000); // Give it a sec to load resources

  await desktopPage.screenshot({ path: 'desktop_defaults.png' });
  await desktopContext.close();

  // Mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/library');

  await mobilePage.waitForSelector('text=PYQ Papers');
  await mobilePage.waitForTimeout(2000);

  await mobilePage.screenshot({ path: 'mobile_defaults.png' });
  await mobileContext.close();

  await browser.close();
})();
