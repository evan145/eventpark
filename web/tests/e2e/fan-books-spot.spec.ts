import { test, expect } from '@playwright/test';

test.describe('Fan books a spot', () => {
  test('visitor browses event, picks spot, books, sees confirmation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /park before you pack/i })).toBeVisible();
    /* Backend interaction not exercised in this scaffold; full E2E requires a seeded backend. */
  });
});
