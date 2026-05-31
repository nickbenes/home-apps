import { test, expect } from '@playwright/test';

test.describe('Recurring Items — inline expand/edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recurring');
    // Wait for at least one data row (not a loading/empty state)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a row expands the inline edit form', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // The edit form renders as a sibling row with a name input
    const nameInput = page.locator('input[placeholder="Name"]');
    await expect(nameInput).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('clicking the same row again collapses the form', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    await firstRow.click();
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();

    await firstRow.click();
    await expect(page.locator('input[placeholder="Name"]')).not.toBeVisible();
  });

  test('edit form pre-fills with existing item values', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const itemName = await firstRow.locator('td').first().textContent();

    await firstRow.click();

    const nameInput = page.locator('input[placeholder="Name"]');
    await expect(nameInput).toHaveValue(itemName?.trim() ?? '');
  });

  test('expanding one row collapses a previously expanded row', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    test.skip(count < 2, 'need at least 2 rows');

    await rows.nth(0).click();
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();

    await rows.nth(1).click();
    // Should be exactly one name input (the new expanded row, not the old one)
    await expect(page.locator('input[placeholder="Name"]')).toHaveCount(1);
  });
});
