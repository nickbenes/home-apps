import { test, expect } from '@playwright/test';

// Unique suffix per run prevents stale-data collisions when the local DB
// retains items from interrupted previous runs.
const RUN_ID = Date.now();
const NAME_A = `E2E Alpha ${RUN_ID}`;
const NAME_B = `E2E Beta  ${RUN_ID}`;

let idA: string;
let idB: string;

test.beforeAll(async ({ request }) => {
  const [rA, rB] = await Promise.all([
    request.post('/api/recurring', { data: { name: NAME_A, amount: -55.00, frequency: 'monthly' } }),
    request.post('/api/recurring', { data: { name: NAME_B, amount: -22.00, frequency: 'monthly' } }),
  ]);
  idA = (await rA.json()).recurring_item_id;
  idB = (await rB.json()).recurring_item_id;
});

test.afterAll(async ({ request }) => {
  await Promise.all([
    idA ? request.delete(`/api/recurring/${idA}`) : Promise.resolve(),
    idB ? request.delete(`/api/recurring/${idB}`) : Promise.resolve(),
  ]);
});

test.describe('Recurring Items — inline expand/edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recurring');
    await expect(page.locator(`tr:has-text("${NAME_A}")`).first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a row expands the inline edit form', async ({ page }) => {
    await page.locator(`tr:has-text("${NAME_A}")`).first().click();

    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('clicking the same row again collapses the form', async ({ page }) => {
    const row = page.locator(`tr:has-text("${NAME_A}")`).first();

    await row.click();
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();

    await row.click();
    await expect(page.locator('input[placeholder="Name"]')).not.toBeVisible();
  });

  test('edit form pre-fills with existing item values', async ({ page }) => {
    await page.locator(`tr:has-text("${NAME_A}")`).first().click();

    await expect(page.locator('input[placeholder="Name"]')).toHaveValue(NAME_A);
  });

  test('expanding one row collapses the previously expanded row', async ({ page }) => {
    const rowA = page.locator(`tr:has-text("${NAME_A}")`).first();
    const rowB = page.locator(`tr:has-text("${NAME_B}")`).first();

    await rowA.click();
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();

    await rowB.click();
    // Exactly one name input visible — the new one, not the old
    await expect(page.locator('input[placeholder="Name"]')).toHaveCount(1);
  });
});
