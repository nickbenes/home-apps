// Idempotent CSV seed importer for the food DB.
// Reads <table>.seed.csv from data/seeds/ (gitignored, private).
// Falls back to <table>.seed.example.csv with a warning when private seed is absent.
// Run with: npm run food:db:import

import { getDb } from './db.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const SEEDS_DIR = path.join(import.meta.dirname, '../data/seeds');
const db = getDb();

const FORCE_EXAMPLE = process.env.SEED_EXAMPLE === '1';

function readSeed(table: string): Record<string, string>[] {
  const privatePath = path.join(SEEDS_DIR, `${table}.seed.csv`);
  const examplePath = path.join(SEEDS_DIR, `${table}.seed.example.csv`);
  if (!FORCE_EXAMPLE && fs.existsSync(privatePath)) {
    return parse(fs.readFileSync(privatePath, 'utf8'),
      { columns: true, skip_empty_lines: true, trim: true });
  }
  if (fs.existsSync(examplePath)) {
    if (!FORCE_EXAMPLE) console.warn(`  ⚠  ${table}: no private seed found — using example data`);
    return parse(fs.readFileSync(examplePath, 'utf8'),
      { columns: true, skip_empty_lines: true, trim: true });
  }
  console.warn(`  ⚠  ${table}: no seed file found — skipping`);
  return [];
}

function num(s: string): number | null {
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}
function str(s: string): string | null {
  return s.trim() === '' ? null : s.trim();
}

console.log('Importing food seeds...');

db.transaction(() => {
  // Ingredients — upsert by id
  const ingredients = readSeed('ingredients');
  const ingStmt = db.prepare(`
    INSERT OR REPLACE INTO ingredients (id, name, category_id, default_unit, pantry_staple)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of ingredients) {
    ingStmt.run(r.id, r.name, r.category_id, str(r.default_unit), parseInt(r.pantry_staple) || 0);
  }
  console.log(`  ingredients: ${ingredients.length} rows`);

  // Recipes — upsert by id
  const recipes = readSeed('recipes');
  const recipeStmt = db.prepare(`
    INSERT OR REPLACE INTO recipes (id, title, servings, tags, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  for (const r of recipes) {
    recipeStmt.run(r.id, r.title, parseInt(r.servings) || 4, r.tags || '[]', str(r.notes));
  }
  console.log(`  recipes: ${recipes.length} rows`);

  // Recipe ingredients — replace per-recipe (delete + reinsert for idempotency)
  const recipeIds = new Set(recipes.map(r => r.id));
  const riRows = readSeed('recipe_ingredients');

  for (const recipeId of recipeIds) {
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);
  }

  const riStmt = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const r of riRows) {
    riStmt.run(r.recipe_id, r.ingredient_id, num(r.quantity), str(r.unit), str(r.notes), parseInt(r.sort_order) || 0);
  }
  console.log(`  recipe_ingredients: ${riRows.length} rows`);
})();

console.log('Done.');
