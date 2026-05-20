import { test, expect } from '@playwright/test';

test('header stays visible after scrolling down', async ({ page }) => {
  await page.goto('/transactions');

  const header = page.locator('header');
  await expect(header).toBeVisible();

  // Scroll down enough to push a non-sticky header out of view
  await page.evaluate(() => window.scrollBy(0, 800));

  // A sticky header's top edge stays at 0; a non-sticky one goes negative
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
});
