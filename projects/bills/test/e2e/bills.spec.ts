import { test, expect } from '@playwright/test';

const TARGET = process.env.SMOKE_URL ? `${process.env.SMOKE_URL}` : 'http://localhost:3000';

test.describe('Bills App Smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the bills app root (deployed or local)
    page.on('console', (msg) => {
      // Print browser console messages to the test output for debugging
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    });
    await page.goto(`${TARGET}/`);
    // Wait for network idle to give the bundle time to execute
    await page.waitForLoadState('networkidle');
  });

  test('initial UI and add bill flow', async ({ page }) => {
  // Debug: dump a short snippet of the page HTML to help diagnose why the app did not render
  // Short debug output (kept minimal)
  const fullHtml = await page.content();
  console.log('PAGE HTML SNIPPET:\n', fullHtml.slice(0, 2000));

  // Heading - allow extra time for the bundle to load on deployed site
  await expect(page.getByRole('heading', { name: 'Bill Payment Planner' })).toBeVisible({ timeout: 15000 });

    // Fill the add bill form (we don't assume an empty initial state — just verify the form works)
    const nameInput = page.getByPlaceholder('Bill name');
    const amountInput = page.getByPlaceholder('Amount');
    const dateInput = page.locator('input[type="date"]').first();
  const addButton = page.getByRole('button', { name: 'Add', exact: true });

    const today = new Date().toISOString().split('T')[0];

    await nameInput.fill('Smoke Test Bill');
    await amountInput.fill('12.34');
    await dateInput.fill(today);
    await addButton.click();

    // Verify the bill is added and visible
    await expect(page.getByText('Smoke Test Bill')).toBeVisible();

  // We don't assert final balance precisely (it depends on seeded data);
  // the presence of the added bill confirms the add flow worked.
  });
});
