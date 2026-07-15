import { test, expect, chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log("Navigating to Home...");
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(__dirname, 'screenshot-01-home.png') });

  console.log("Subscribing...");
  await page.fill('input[placeholder="Your name"]', 'Test User');
  await page.fill('input[placeholder="Your email"]', `testuser_${Date.now()}@example.com`);
  await page.fill('input[placeholder="Password"]', 'password123');
  await page.click('button:has-text("Subscribe")');

  await page.waitForURL('**/dashboard');
  await page.screenshot({ path: path.join(__dirname, 'screenshot-02-dashboard.png') });

  console.log("Navigating to Feature Card...");
  await page.goto('http://localhost:5173/');
  await page.click('text=PYQ Papers');

  await page.waitForURL('**/library?category=Previous%20Year%20Papers');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(__dirname, 'screenshot-03-library.png') });

  console.log("Clicking a Book...");
  const viewDetailsButton = await page.$('text=View Details');
  if (viewDetailsButton) {
     await viewDetailsButton.click();
     await page.waitForLoadState('networkidle');
     // Wait for iframe to appear
     await page.waitForSelector('iframe');
     await page.screenshot({ path: path.join(__dirname, 'screenshot-04-pdfviewer.png') });
  } else {
     console.log("No books found to click.");
  }

  await browser.close();
  console.log("Flow script ready.");
}

runTest().catch(console.error);
