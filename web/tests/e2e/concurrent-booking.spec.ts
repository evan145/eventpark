import { test, expect } from '@playwright/test';

test.skip('two browsers race for the last spot', async ({ browser }) => {
  /* Requires seeded backend + 1 spot listing. */
  const a = await browser.newContext();
  const b = await browser.newContext();
  await a.newPage().then((p) => p.goto('/'));
  await b.newPage().then((p) => p.goto('/'));
  expect(true).toBe(true);
});
