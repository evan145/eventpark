import { test, expect } from '@playwright/test';

test('snapshot: landing hero — desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing-desktop.png', { fullPage: false, maxDiffPixelRatio: 0.05 });
});

test('snapshot: landing hero — mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing-mobile.png', { fullPage: false, maxDiffPixelRatio: 0.05 });
});

test('snapshot: 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page).toHaveScreenshot('not-found.png', { maxDiffPixelRatio: 0.05 });
});
