const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');

  // Wait for the animation to run past 8000ms (we can actually set prefers-reduced-motion to fast-forward)
  // Or we can just wait 8.5 seconds. We'll set reduced motion to trigger the settled state immediately,
  // or we can just wait. The animation uses `prefers-reduced-motion` to skip to end if true. Let's emulate that.

  const browserSettled = await chromium.launch({
    args: ['--force-prefers-reduced-motion']
  });
  const contextSettled = await browserSettled.newContext({
    colorScheme: 'light',
    reducedMotion: 'reduce'
  });

  const widths = [300, 320, 360, 390, 420];

  for (const width of widths) {
    const pageSettled = await contextSettled.newPage();
    await pageSettled.setViewportSize({ width, height: 800 });
    await pageSettled.goto('http://localhost:5173');
    await pageSettled.waitForTimeout(1000); // Wait for layout to settle

    // Check if icons overlap or extend past edge.
    await pageSettled.screenshot({ path: `screenshot_w${width}.png` });
    console.log(`Saved screenshot for width ${width}`);
    await pageSettled.close();
  }

  await browserSettled.close();
  await browser.close();
})();
