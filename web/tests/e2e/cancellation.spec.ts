import { test, expect } from '@playwright/test';

test.skip('guest cancels >48h out and receives full refund toast', async ({ page }) => {
  /* Requires seeded booking; skipped in scaffold. */
  await page.goto('/bookings/1');
  await expect(page).toHaveURL(/\/bookings\/1/);
});
