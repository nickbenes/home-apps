import { test, expect } from '@playwright/test';

test.describe('Todo App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the todos app before each test
  await page.goto('/todos/');
  });

  test.describe('Initial Page Load', () => {
    test('should display the app title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Todo App' })).toBeVisible();
    });

    test('should display the input field and add button', async ({ page }) => {
      await expect(page.getByPlaceholder('Add a new todo...')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    });

    test('should have an empty todo list initially', async ({ page }) => {
      // Wait a moment for any potential todos to load
      await page.waitForTimeout(500);

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(0);
    });
  });

  test.describe('Adding Todos', () => {
    test('should add a new todo using the Add button', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');
      const addButton = page.getByRole('button', { name: 'Add' });

      await input.fill('Buy groceries');
      await addButton.click();

      // Verify the todo appears in the list
      await expect(page.getByText('Buy groceries')).toBeVisible();

      // Verify the input is cleared
      await expect(input).toHaveValue('');
    });

    test('should add a new todo using Enter key', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      await input.fill('Write tests');
      await input.press('Enter');

      // Verify the todo appears in the list
      await expect(page.getByText('Write tests')).toBeVisible();

      // Verify the input is cleared
      await expect(input).toHaveValue('');
    });

    test('should add multiple todos', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // Add first todo
      await input.fill('First todo');
      await input.press('Enter');
      await expect(page.getByText('First todo')).toBeVisible();

      // Add second todo
      await input.fill('Second todo');
      await input.press('Enter');
      await expect(page.getByText('Second todo')).toBeVisible();

      // Add third todo
      await input.fill('Third todo');
      await input.press('Enter');
      await expect(page.getByText('Third todo')).toBeVisible();

      // Verify all todos are present
      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(3);
    });

    test('should not add empty todos', async ({ page }) => {
      const addButton = page.getByRole('button', { name: 'Add' });

      // Try to add empty todo
      await addButton.click();

      // Verify no todos were added
      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(0);
    });

    test('should trim whitespace from todo titles', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      await input.fill('   Todo with spaces   ');
      await input.press('Enter');

      // The todo should still be added (backend accepts it)
      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(1);
    });
  });

  test.describe('Completing Todos', () => {
    test('should toggle todo completion status', async ({ page }) => {
      // Add a todo
      const input = page.getByPlaceholder('Add a new todo...');
      await input.fill('Complete me');
      await input.press('Enter');

  // Scope to the specific list item for this todo
  const item = page.locator('ul li', { hasText: 'Complete me' });
  const checkbox = item.locator('input[type="checkbox"]');
  await expect(checkbox).not.toBeChecked();

  // Click the checkbox to complete the todo
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  // Verify the text has strikethrough styling
  const todoText = item.getByText('Complete me');
  await expect(todoText).toHaveCSS('text-decoration', /line-through/);
    });

    test('should toggle todo back to incomplete', async ({ page }) => {
      // Add a todo
      const input = page.getByPlaceholder('Add a new todo...');
      await input.fill('Toggle me');
      await input.press('Enter');

  const item = page.locator('ul li', { hasText: 'Toggle me' });
  const checkbox = item.locator('input[type="checkbox"]');

  // Complete the todo
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  // Uncomplete the todo
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();

  // Verify the text no longer has strikethrough
  const todoText = item.getByText('Toggle me');
  await expect(todoText).toHaveCSS('text-decoration', /none/);
    });

    test('should handle multiple todos with different completion states', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // Add three todos
      await input.fill('Todo 1');
      await input.press('Enter');

      await input.fill('Todo 2');
      await input.press('Enter');

      await input.fill('Todo 3');
      await input.press('Enter');

  // Complete the second todo by scoping to its list item
  const item1 = page.locator('ul li', { hasText: 'Todo 1' });
  const item2 = page.locator('ul li', { hasText: 'Todo 2' });
  const item3 = page.locator('ul li', { hasText: 'Todo 3' });

  await item2.locator('input[type="checkbox"]').check();

  // Verify states
  await expect(item1.locator('input[type="checkbox"]')).not.toBeChecked();
  await expect(item2.locator('input[type="checkbox"]')).toBeChecked();
  await expect(item3.locator('input[type="checkbox"]')).not.toBeChecked();

  // Verify styling
  await expect(item1.getByText('Todo 1')).toHaveCSS('text-decoration', /none/);
  await expect(item2.getByText('Todo 2')).toHaveCSS('text-decoration', /line-through/);
  await expect(item3.getByText('Todo 3')).toHaveCSS('text-decoration', /none/);
    });
  });

  test.describe('Deleting Todos', () => {
    test('should delete a todo', async ({ page }) => {
      // Add a todo
      const input = page.getByPlaceholder('Add a new todo...');
      await input.fill('Delete me');
      await input.press('Enter');

      // Verify the todo is visible
      await expect(page.getByText('Delete me')).toBeVisible();

  // Click the delete button scoped to the item
  const delItem = page.locator('ul li', { hasText: 'Delete me' });
  await delItem.getByRole('button', { name: 'Delete' }).click();

      // Verify the todo is removed
      await expect(page.getByText('Delete me')).not.toBeVisible();

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(0);
    });

    test('should delete the correct todo when multiple exist', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // Add three todos
      await input.fill('Keep me 1');
      await input.press('Enter');

      await input.fill('Delete me');
      await input.press('Enter');

      await input.fill('Keep me 2');
      await input.press('Enter');

  // Delete the middle todo by scoping to its list item text
  const delItem = page.locator('ul li', { hasText: 'Delete me' });
  await delItem.getByRole('button', { name: 'Delete' }).click();

      // Verify the correct todo was deleted
      await expect(page.getByText('Keep me 1')).toBeVisible();
      await expect(page.getByText('Delete me')).not.toBeVisible();
      await expect(page.getByText('Keep me 2')).toBeVisible();

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(2);
    });

    test('should delete a completed todo', async ({ page }) => {
      // Add and complete a todo
      const input = page.getByPlaceholder('Add a new todo...');
      await input.fill('Complete and delete');
      await input.press('Enter');

  const delItem = page.locator('ul li', { hasText: 'Complete and delete' });
  const checkbox = delItem.locator('input[type="checkbox"]');
  await checkbox.check();

  // Delete the completed todo (scoped)
  await delItem.getByRole('button', { name: 'Delete' }).click();

      // Verify it's removed
      await expect(page.getByText('Complete and delete')).not.toBeVisible();

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(0);
    });
  });

  test.describe('Full User Workflows', () => {
    test('should handle a complete todo lifecycle', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // 1. Add a todo
      await input.fill('Complete lifecycle');
      await input.press('Enter');
      await expect(page.getByText('Complete lifecycle')).toBeVisible();

  // 2-4. Toggle completion using the scoped item checkbox
  const lifecycleItem = page.locator('ul li', { hasText: 'Complete lifecycle' });
  const lifecycleCheckbox = lifecycleItem.locator('input[type="checkbox"]');
  await lifecycleCheckbox.check();
  await expect(lifecycleCheckbox).toBeChecked();

  // 3. Mark as incomplete
  await lifecycleCheckbox.uncheck();
  await expect(lifecycleCheckbox).not.toBeChecked();

  // 4. Mark as complete again
  await lifecycleCheckbox.check();
  await expect(lifecycleCheckbox).toBeChecked();

  // 5. Delete the todo (scoped)
  await lifecycleItem.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Complete lifecycle')).not.toBeVisible();
    });

    test('should manage multiple todos with various operations', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // Add multiple todos
      await input.fill('Task 1');
      await input.press('Enter');

      await input.fill('Task 2');
      await input.press('Enter');

      await input.fill('Task 3');
      await input.press('Enter');

  // Complete first and third tasks by scoping to their items
  const t1 = page.locator('ul li', { hasText: 'Task 1' });
  const t2 = page.locator('ul li', { hasText: 'Task 2' });
  const t3 = page.locator('ul li', { hasText: 'Task 3' });

  await t1.locator('input[type="checkbox"]').check();
  await t3.locator('input[type="checkbox"]').check();

  // Verify states
  await expect(t1.locator('input[type="checkbox"]')).toBeChecked();
  await expect(t2.locator('input[type="checkbox"]')).not.toBeChecked();
  await expect(t3.locator('input[type="checkbox"]')).toBeChecked();

  // Delete the middle task (scoped)
  await t2.getByRole('button', { name: 'Delete' }).click();

      // Verify state after deletion
      await expect(page.getByText('Task 1')).toBeVisible();
      await expect(page.getByText('Task 2')).not.toBeVisible();
      await expect(page.getByText('Task 3')).toBeVisible();

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(2);
    });

    test('should persist state across operations', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      // Add several todos
      for (let i = 1; i <= 5; i++) {
        await input.fill(`Todo ${i}`);
        await input.press('Enter');
      }

  // Complete todos 2 and 4 (scoped)
  const t2 = page.locator('ul li', { hasText: 'Todo 2' });
  const t4 = page.locator('ul li', { hasText: 'Todo 4' });
  await t2.locator('input[type="checkbox"]').check();
  await t4.locator('input[type="checkbox"]').check();

  // Delete todo 3 (scoped)
  const t3 = page.locator('ul li', { hasText: 'Todo 3' });
  await t3.getByRole('button', { name: 'Delete' }).click();

      // Verify remaining todos and their states
      await expect(page.getByText('Todo 1')).toBeVisible();
      await expect(page.getByText('Todo 2')).toBeVisible();
      await expect(page.getByText('Todo 3')).not.toBeVisible();
      await expect(page.getByText('Todo 4')).toBeVisible();
      await expect(page.getByText('Todo 5')).toBeVisible();

      const todoItems = page.locator('ul li');
      await expect(todoItems).toHaveCount(4);
    });
  });

  test.describe('UI/UX Elements', () => {
    test('should display todos in a list format', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      await input.fill('Test todo');
      await input.press('Enter');

      // Check for list structure
      const list = page.locator('ul');
      await expect(list).toBeVisible();

  const listItem = page.locator('ul li', { hasText: 'Test todo' });
  await expect(listItem).toBeVisible();
    });

    test('should show each todo with checkbox and delete button', async ({ page }) => {
      const input = page.getByPlaceholder('Add a new todo...');

      await input.fill('UI Test');
      await input.press('Enter');

  const listItem = page.locator('ul li', { hasText: 'UI Test' });

  // Check for checkbox
  await expect(listItem.locator('input[type="checkbox"]')).toBeVisible();

  // Check for todo text
  await expect(listItem.getByText('UI Test')).toBeVisible();

  // Check for delete button
  await expect(listItem.getByRole('button', { name: 'Delete' })).toBeVisible();
    });
  });
});
