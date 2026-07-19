import { test, expect } from '@playwright/test';

test('verify dropdown styles', async ({ page }) => {
  await page.goto('http://localhost:5173/library'); // The library page uses dropdowns

  // Wait for the dropdown trigger
  const dropdownTrigger = page.locator('text=Class 10').first().locator('..');

  await dropdownTrigger.waitFor({ state: 'visible' });

  // Take screenshot of closed state
  await page.screenshot({ path: 'dropdown-closed.png' });

  // Click to open
  await dropdownTrigger.click();

  // Take screenshot of open state
  await page.screenshot({ path: 'dropdown-open.png' });
});
