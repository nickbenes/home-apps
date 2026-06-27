import { test, expect } from '@playwright/test';

// Uses the example seed data (SEED_EXAMPLE=1, loaded by the webServer command
// in playwright.food.config.ts): recipes "One-Pot Pasta Primavera" (garlic: 4
// cloves) and "Quick Chicken Stir-Fry" (garlic: 3 cloves) both at their base
// servings, so a shopping list generated without scaling should show garlic
// summed to 7 cloves once both are assigned to the same meal slot.

const RUN_ID = Date.now();
const PLAN_NAME = `E2E Multi-Recipe ${RUN_ID}`;

test.beforeEach(async ({ page }) => {
  await page.goto('menu');
  await expect(page.getByRole('heading', { name: 'Menu Planner' })).toBeVisible();
});

// The "Plan name" / "Week starting" <label>s aren't associated to their
// <input>s via htmlFor/id, so getByLabel won't find them — scope queries to
// the modal overlay (identified by its heading) instead, both to find the
// name input and to disambiguate "Create" from the empty-state CTA button.
function newPlanModal(page: import('@playwright/test').Page) {
  return page.locator('div.fixed', { hasText: 'New Week Plan' });
}

test('assigning two recipes to the same meal slot keeps both, with independent servings', async ({ page }) => {
  await page.getByRole('button', { name: 'New Plan' }).click();
  await newPlanModal(page).locator('input').first().fill(PLAN_NAME);
  await newPlanModal(page).getByRole('button', { name: 'Create' }).click();

  await expect(page.locator('select').filter({ hasText: PLAN_NAME })).toBeVisible();

  const pastaCard = page.locator('[draggable="true"]', { hasText: 'One-Pot Pasta Primavera' });
  const stirFryCard = page.locator('[draggable="true"]', { hasText: 'Quick Chicken Stir-Fry' });
  const mondayDinner = page.locator('[data-slot-day="0"][data-slot-meal="dinner"]');

  await pastaCard.dragTo(mondayDinner);
  await expect(mondayDinner).toContainText('One-Pot Pasta Primavera');

  await stirFryCard.dragTo(mondayDinner);
  await expect(mondayDinner).toContainText('One-Pot Pasta Primavera');
  await expect(mondayDinner).toContainText('Quick Chicken Stir-Fry');

  // Each recipe in the cell gets its own servings input, defaulted to the
  // recipe's own serving size (4 for both seed recipes here).
  const servingsInputs = mondayDinner.locator('input[type="number"]');
  await expect(servingsInputs).toHaveCount(2);
  await expect(servingsInputs.nth(0)).toHaveValue('4');
  await expect(servingsInputs.nth(1)).toHaveValue('4');

  // Removing one recipe from the cell leaves the other untouched.
  await mondayDinner.locator('button[title="Remove"]').first().click();
  await expect(mondayDinner).not.toContainText('One-Pot Pasta Primavera');
  await expect(mondayDinner).toContainText('Quick Chicken Stir-Fry');
});

test('shopping list generated from a multi-recipe meal sums shared ingredients', async ({ page, request }) => {
  await page.getByRole('button', { name: 'New Plan' }).click();
  const planName = `${PLAN_NAME} for shopping`;
  await newPlanModal(page).locator('input').first().fill(planName);
  await newPlanModal(page).getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('select').filter({ hasText: planName })).toBeVisible();

  const mondayDinner = page.locator('[data-slot-day="0"][data-slot-meal="dinner"]');
  await page.locator('[draggable="true"]', { hasText: 'One-Pot Pasta Primavera' }).dragTo(mondayDinner);
  await expect(mondayDinner).toContainText('One-Pot Pasta Primavera');
  await page.locator('[draggable="true"]', { hasText: 'Quick Chicken Stir-Fry' }).dragTo(mondayDinner);
  await expect(mondayDinner).toContainText('Quick Chicken Stir-Fry');

  // Read the new plan's id straight from the API rather than scraping the
  // <select>'s DOM value attribute (React renders option values as text).
  const plans = await (await request.get('/food/api/menu-plans')).json();
  const plan = plans.find((p: { name: string }) => p.name === planName);
  expect(plan).toBeTruthy();

  const res = await request.post(`/food/api/shopping-lists/from-plan/${plan.id}`, {
    data: { name: `${planName} — list` },
  });
  expect(res.ok()).toBeTruthy();
  const list = await res.json();

  const garlic = list.items.find((i: { name: string }) => i.name === 'Garlic');
  expect(garlic).toBeTruthy();
  expect(garlic.quantity).toBe(7);
  expect(garlic.unit).toBe('cloves');
});
