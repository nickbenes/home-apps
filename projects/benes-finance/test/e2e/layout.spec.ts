import { test, expect } from '@playwright/test';

test('nav stays visible after scrolling down', async ({ page }) => {
  await page.goto('/transactions');

  // Desktop layout uses a sticky sidebar (<aside>); mobile uses a fixed header (<header>).
  // The Playwright config uses Desktop Chrome (1280px), so we check the sidebar.
  const nav = page.locator('aside');
  await expect(nav).toBeVisible();

  // Scroll down enough to push a non-sticky element out of view
  await page.evaluate(() => window.scrollBy(0, 800));

  // The sidebar is sticky top-0, so its top edge should remain at y=0 after scroll
  const box = await nav.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
});
