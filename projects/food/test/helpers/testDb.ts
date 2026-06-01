import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Babel transforms ESM → CJS for Jest, so __dirname is available here.
const MIGRATIONS_DIR = path.join(__dirname, '../../db/migrations');

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  return db;
}

// Synthetic fixture data — no real names, safe to commit.
export function seedFixtures(db: Database.Database): void {
  db.transaction(() => {
    // Ingredients
    db.prepare(`
      INSERT INTO ingredients (id, name, category_id, default_unit)
      VALUES ('chicken_breast', 'Chicken Breast', 'proteins', 'lbs')
    `).run();
    db.prepare(`
      INSERT INTO ingredients (id, name, category_id, default_unit)
      VALUES ('ground_beef', 'Ground Beef', 'proteins', 'lbs')
    `).run();
    db.prepare(`
      INSERT INTO ingredients (id, name, category_id, pantry_staple)
      VALUES ('olive_oil', 'Olive Oil', 'pantry', 1)
    `).run();

    // Recipe with one linked ingredient
    db.prepare(`
      INSERT INTO recipes (id, title, servings, tags)
      VALUES ('test_stir_fry', 'Test Stir Fry', 7, '["weeknight","dairy-free"]')
    `).run();
    db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, sort_order)
      VALUES ('test_stir_fry', 'chicken_breast', 2, 'lbs', 0)
    `).run();

    // Family member
    db.prepare(`
      INSERT INTO family_members (id, display_name, dietary_flags)
      VALUES ('member_1', 'Test Person', '["dairy-free"]')
    `).run();

    // Menu plan with two pre-assigned dinner slots
    db.prepare(`
      INSERT INTO menu_plans (id, name, week_start)
      VALUES ('test_plan', 'Test Week', '2026-06-02')
    `).run();
    db.prepare(`
      INSERT INTO menu_plan_slots (menu_plan_id, day_of_week, meal_slot, recipe_id)
      VALUES ('test_plan', 0, 'dinner', 'test_stir_fry')
    `).run();
    db.prepare(`
      INSERT INTO menu_plan_slots (menu_plan_id, day_of_week, meal_slot, recipe_id)
      VALUES ('test_plan', 1, 'lunch', NULL)
    `).run();
  })();
}
