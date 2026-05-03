import { test, expect } from '@playwright/test';

test('host signup form is reachable from landing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /list your spots/i }).click();
  await expect(page).toHaveURL(/\/host\/signup/);
  await expect(page.getByRole('heading', { name: /become a host/i })).toBeVisible();
});
