// Idempotent CSV seed importer for the finance DB.
// Reads <table>.seed.csv from data/seeds/ (gitignored, private).
// Falls back to <table>.seed.example.csv with a warning when private seed is absent.
// Run with: npm run finance:db:import

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

console.log('Importing finance seeds...');

db.transaction(() => {
  const cats = readSeed('budget_categories');
  const catStmt = db.prepare(`
    INSERT OR REPLACE INTO budget_categories (category_id, name, display_order)
    VALUES (?, ?, ?)
  `);
  for (const r of cats) catStmt.run(r.category_id, r.name, parseInt(r.display_order) || 0);
  console.log(`  budget_categories: ${cats.length} rows`);

  const items = readSeed('budget_items');
  const itemStmt = db.prepare(`
    INSERT OR REPLACE INTO budget_items (budget_item_id, category_id, name, expected_amount, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of items) itemStmt.run(r.budget_item_id, r.category_id, r.name, num(r.expected_amount), str(r.notes));
  console.log(`  budget_items: ${items.length} rows`);

  const accounts = readSeed('accounts');
  const acctStmt = db.prepare(`
    INSERT OR REPLACE INTO accounts (
      account_id, creditor, account_type, status,
      original_amount, current_balance, balance_date,
      interest_rate_pct, account_number, portal_url,
      payoff_date_est, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of accounts) {
    acctStmt.run(
      r.account_id, r.creditor, r.account_type, r.status,
      num(r.original_amount), num(r.current_balance), str(r.balance_date),
      num(r.interest_rate_pct), str(r.account_number), str(r.portal_url),
      str(r.payoff_date_est), str(r.notes),
    );
  }
  console.log(`  accounts: ${accounts.length} rows`);

  const recurring = readSeed('recurring_items');
  const recStmt = db.prepare(`
    INSERT OR REPLACE INTO recurring_items (
      recurring_item_id, budget_item_id, account_id, name,
      amount, frequency, payments_per_year, effective_monthly,
      is_active, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of recurring) {
    recStmt.run(
      r.recurring_item_id, str(r.budget_item_id), str(r.account_id), r.name,
      num(r.amount)!, r.frequency, num(r.payments_per_year)!, num(r.effective_monthly)!,
      parseInt(r.is_active) ?? 1, str(r.notes),
    );
  }
  console.log(`  recurring_items: ${recurring.length} rows`);
})();

console.log('Done.');
