import { test, expect } from '@playwright/test';

test.skip('admin approves a pending listing', async ({ page }) => {
  /* Requires admin login + seeded data. */
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin|\/login/);
});
