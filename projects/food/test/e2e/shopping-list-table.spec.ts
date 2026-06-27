import { test, expect, type Page } from '@playwright/test';

const RUN_ID = Date.now();

const FAKE_PRODUCT = {
  itemId: 'wm-12345',
  name: 'E2E Test Walmart Product 12-Pack',
  price: 9.99,
  imageUrl: '',
  url: 'https://www.walmart.com/ip/wm-12345',
  availabilityStatus: 'Available',
  size: '12 Count',
  packCount: 12,
};

// Real Walmart credentials aren't available in this test environment (and
// shouldn't be required for a deterministic e2e run) — mock the search
// endpoint instead of hitting the live Walmart API.
async function mockWalmartSearch(page: Page) {
  await page.route('**/food/api/walmart/search**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([FAKE_PRODUCT]) })
  );
}

async function createList(request: import('@playwright/test').APIRequestContext, name: string) {
  const res = await request.post('/food/api/shopping-lists', { data: { name } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function openList(page: Page, listName: string) {
  await page.goto('shopping');
  // The list name renders as a plain <p>, not wrapped in anything else with
  // matching text — click it directly; the click bubbles up to the
  // containing row's onClick handler that actually loads the list.
  await page.locator('p', { hasText: listName }).first().click();
  await expect(page.locator('table')).toBeVisible();
}

async function addItem(page: Page, { name, qty, unit }: { name: string; qty?: string; unit?: string }) {
  if (qty) await page.getByPlaceholder('qty').fill(qty);
  if (unit) await page.getByPlaceholder('unit').fill(unit);
  await page.getByPlaceholder('Add item…').fill(name);
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByPlaceholder('Add item…')).toHaveValue('');
}

test('inline edit of name, quantity, and unit persists after reload', async ({ page, request }) => {
  const list = await createList(request, `E2E Inline Edit ${RUN_ID}`);
  await openList(page, list.name);

  await addItem(page, { name: 'Original Name', qty: '2', unit: 'each' });
  const row = page.locator('tbody tr').first();

  const inputs = row.locator('input');
  await inputs.nth(0).fill('Edited Name');
  await inputs.nth(0).press('Tab');
  await inputs.nth(1).fill('5');
  await inputs.nth(1).press('Tab');
  await inputs.nth(2).fill('lbs');
  await inputs.nth(2).press('Tab');

  await page.reload();
  await page.locator('p', { hasText: list.name }).first().click();
  await expect(page.locator('table')).toBeVisible();

  const reloadedInputs = page.locator('tbody tr').first().locator('input');
  await expect(reloadedInputs.nth(0)).toHaveValue('Edited Name');
  await expect(reloadedInputs.nth(1)).toHaveValue('5');
  await expect(reloadedInputs.nth(2)).toHaveValue('lbs');
});

test('store dropdown: a built-in store enables product search, "Other" shows a free-text store field', async ({ page, request }) => {
  await mockWalmartSearch(page);
  const list = await createList(request, `E2E Store Dropdown ${RUN_ID}`);
  await openList(page, list.name);

  await addItem(page, { name: 'Walmart Item', qty: '1' });
  await addItem(page, { name: 'Co-op Item', qty: '1' });

  const rows = page.locator('tbody tr');
  const walmartRow = rows.nth(0);
  const coopRow = rows.nth(1);

  // Built-in store → searchable, "Find product" appears, opens the search
  // modal, and selecting a result persists a structured detail.
  await walmartRow.locator('select').selectOption('Walmart');
  await walmartRow.getByRole('button', { name: 'Find product' }).click();
  await expect(page.getByRole('heading', { name: 'Find on Walmart' })).toBeVisible();
  await page.getByRole('button', { name: FAKE_PRODUCT.name }).click();
  await expect(page.getByRole('heading', { name: 'Find on Walmart' })).not.toBeVisible();
  await expect(walmartRow).toContainText(FAKE_PRODUCT.name);

  // "Other" store → free-text store input, and the detail column for a
  // non-searchable store is a plain text field, not a search trigger.
  await coopRow.locator('select').selectOption('__other__');
  const otherInput = coopRow.getByPlaceholder('Store name…');
  await otherInput.fill('Wegmans Co-op');
  await otherInput.press('Tab');
  await expect(coopRow.getByRole('button', { name: 'Find product' })).not.toBeVisible();
  const detailInput = coopRow.getByPlaceholder('Details…');
  await detailInput.fill('aisle 5, top shelf');
  await detailInput.press('Tab');

  await page.reload();
  await page.locator('p', { hasText: list.name }).first().click();
  await expect(page.locator('table')).toBeVisible();

  const reloadedRows = page.locator('tbody tr');
  await expect(reloadedRows.nth(0)).toContainText(FAKE_PRODUCT.name);
  await expect(reloadedRows.nth(1).getByPlaceholder('Store name…')).toHaveValue('Wegmans Co-op');
  await expect(reloadedRows.nth(1).getByPlaceholder('Details…')).toHaveValue('aisle 5, top shelf');
});

test('sorting and filtering the items table', async ({ page, request }) => {
  const list = await createList(request, `E2E Sort Filter ${RUN_ID}`);
  await openList(page, list.name);

  await addItem(page, { name: 'Zucchini', qty: '3' });
  await addItem(page, { name: 'Apples', qty: '10' });
  await addItem(page, { name: 'Milk', qty: '1' });

  async function nameColumn() {
    return page.locator('tbody tr').evaluateAll(trs =>
      trs.map(tr => (tr.querySelectorAll('input')[0] as HTMLInputElement).value)
    );
  }

  await expect.poll(nameColumn).toEqual(['Zucchini', 'Apples', 'Milk']);

  await page.getByRole('button', { name: 'Item', exact: true }).click();
  await expect.poll(nameColumn).toEqual(['Apples', 'Milk', 'Zucchini']);

  await page.getByRole('button', { name: 'Item', exact: true }).click();
  await expect.poll(nameColumn).toEqual(['Zucchini', 'Milk', 'Apples']);

  // Quantity sort, ascending — Milk (1) sorts to the front.
  await page.getByRole('button', { name: 'Qty' }).click();
  const qtyColumn = () => page.locator('tbody tr').evaluateAll(trs =>
    trs.map(tr => (tr.querySelectorAll('input')[1] as HTMLInputElement).value)
  );
  await expect.poll(qtyColumn).toEqual(['1', '3', '10']);
  await expect.poll(nameColumn).toEqual(['Milk', 'Zucchini', 'Apples']);

  // Checked filter: checking Milk (row 0, per the sort above) and filtering
  // to "Unchecked" hides it; "All" brings it back.
  await page.locator('tbody tr').nth(0).locator('button').first().click();
  await page.getByRole('combobox').first().selectOption('unchecked');
  await expect.poll(nameColumn).not.toContain('Milk');
  await page.getByRole('combobox').first().selectOption('all');
  await expect.poll(nameColumn).toContain('Milk');
});
