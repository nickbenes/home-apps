// One-shot script: export reference tables from benes-finance.db → data/seeds/*.seed.csv
// Run once to recover data from the legacy database.
// Usage: tsx scripts/extract-finance-seeds.ts

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const OLD_DB = path.join(__dirname, '../projects/finance/data/benes-finance.db');
const SEEDS_DIR = path.join(__dirname, '../projects/finance/data/seeds');

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

if (!fs.existsSync(OLD_DB)) {
  console.error(`benes-finance.db not found at ${OLD_DB}`);
  process.exit(1);
}

const db = new Database(OLD_DB, { readonly: true });
fs.mkdirSync(SEEDS_DIR, { recursive: true });

const tables = [
  {
    name: 'budget_categories',
    query: 'SELECT category_id, name, display_order FROM budget_categories ORDER BY display_order',
  },
  {
    name: 'budget_items',
    query: 'SELECT budget_item_id, category_id, name, expected_amount, notes FROM budget_items ORDER BY category_id, budget_item_id',
  },
  {
    name: 'accounts',
    query: `SELECT account_id, creditor, account_type, status,
              original_amount, current_balance, balance_date,
              interest_rate_pct, account_number, portal_url,
              payoff_date_est, notes
            FROM accounts ORDER BY account_id`,
  },
  {
    name: 'recurring_items',
    query: `SELECT recurring_item_id, budget_item_id, account_id, name,
              amount, frequency, payments_per_year, effective_monthly,
              is_active, notes
            FROM recurring_items ORDER BY recurring_item_id`,
  },
];

console.log('Extracting finance seeds from benes-finance.db...');
for (const { name, query } of tables) {
  const rows = db.prepare(query).all() as Record<string, unknown>[];
  const outPath = path.join(SEEDS_DIR, `${name}.seed.csv`);
  fs.writeFileSync(outPath, toCsv(rows));
  console.log(`  ${name}: ${rows.length} rows → ${outPath}`);
}
db.close();
console.log('Done. Private seeds written to projects/finance/data/seeds/');
