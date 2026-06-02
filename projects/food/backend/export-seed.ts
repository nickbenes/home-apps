// Exports current food DB ingredient and recipe data to data/seeds/<table>.seed.csv.
// Exported files are gitignored; use them as private seeds or backups.
// Run with: npm run food:db:export

import { getDb } from './db.js';
import fs from 'fs';
import path from 'path';

const SEEDS_DIR = path.join(import.meta.dirname, '../data/seeds');
const db = getDb();

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = row[h];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
  }
  return lines.join('\n') + '\n';
}

const exports_ = [
  {
    table: 'ingredients',
    query: 'SELECT id, name, category_id, default_unit, pantry_staple FROM ingredients ORDER BY category_id, id',
  },
  {
    table: 'recipes',
    query: 'SELECT id, title, servings, tags, notes FROM recipes ORDER BY id',
  },
  {
    table: 'recipe_ingredients',
    query: `SELECT recipe_id, ingredient_id, quantity, unit, notes, sort_order
            FROM recipe_ingredients ORDER BY recipe_id, sort_order`,
  },
];

fs.mkdirSync(SEEDS_DIR, { recursive: true });
console.log('Exporting food seeds...');
for (const { table, query } of exports_) {
  const rows = db.prepare(query).all() as Record<string, unknown>[];
  const outPath = path.join(SEEDS_DIR, `${table}.seed.csv`);
  fs.writeFileSync(outPath, toCsv(rows));
  console.log(`  ${table}: ${rows.length} rows → ${outPath}`);
}
console.log('Done. Files written to projects/food/data/seeds/');
