// Exports current finance DB reference tables to data/seeds/<table>.seed.csv.
// Exported files are gitignored; use them as private seeds or as backups.
// Run with: npm run finance:db:export

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
    table: 'budget_categories',
    query: 'SELECT category_id, name, display_order FROM budget_categories ORDER BY display_order',
  },
  {
    table: 'budget_items',
    query: 'SELECT budget_item_id, category_id, name, expected_amount, notes FROM budget_items ORDER BY category_id, budget_item_id',
  },
  {
    table: 'accounts',
    query: `SELECT account_id, creditor, account_type, status,
              original_amount, current_balance, balance_date,
              interest_rate_pct, account_number, portal_url,
              payoff_date_est, notes
            FROM accounts ORDER BY account_id`,
  },
  {
    table: 'recurring_items',
    query: `SELECT recurring_item_id, budget_item_id, account_id, name,
              amount, frequency, payments_per_year, effective_monthly,
              is_active, notes
            FROM recurring_items ORDER BY recurring_item_id`,
  },
];

fs.mkdirSync(SEEDS_DIR, { recursive: true });
console.log('Exporting finance seeds...');
for (const { table, query } of exports_) {
  const rows = db.prepare(query).all() as Record<string, unknown>[];
  const outPath = path.join(SEEDS_DIR, `${table}.seed.csv`);
  fs.writeFileSync(outPath, toCsv(rows));
  console.log(`  ${table}: ${rows.length} rows → ${outPath}`);
}
console.log('Done. Files written to projects/finance/data/seeds/');
