// seed.example.ts — Version-controlled template for the CSV seeder.
// Copy to seed.ts (which is gitignored) and fill in:
//   1. CSV filenames (update when you have new exports)
//   2. CASHFLOW_TO_BUDGET_ITEM mapping entries
//   3. Any additional account type/status mappings your CSV uses
//
// Run with: npm run db:seed

import { getDb } from './db.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(import.meta.dirname, '../data/PRIVATE-financial-csv');
const db = getDb();

// Update these when you have new CSV exports
const CSV_ACCOUNTS = 'accounts-YYYY-MM-DD.csv';
const CSV_BUDGET   = 'budget-YYYY-MM-DD.csv';
const CSV_CASHFLOW = 'cashflow-YYYY-MM-DD.csv';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readCsv(filename: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseAmount(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── Account type / status normalization ──────────────────────────────────────
// The accounts CSV uses free-text values for type and status.
// These functions map them to the schema's CHECK constraint enum values.
//
// Valid account_type values:
//   personal_loan | mortgage | credit_card | student_loan | tax_debt |
//   auto_loan | settlement | collections | judgment | bnpl | income_source
//
// Valid status values:
//   active | delinquent | paid_off | charged_off | in_collections | judgment | settled

type AccountType =
  | 'personal_loan' | 'mortgage' | 'credit_card' | 'student_loan'
  | 'tax_debt' | 'auto_loan' | 'settlement' | 'collections'
  | 'judgment' | 'bnpl' | 'income_source';

type AccountStatus =
  | 'active' | 'delinquent' | 'paid_off' | 'charged_off'
  | 'in_collections' | 'judgment' | 'settled';

function normalizeAccountType(raw: string): AccountType {
  const s = raw.toLowerCase();
  // Add/adjust mappings to match whatever your CSV uses in the "type" column
  if (s.includes('mortgage'))     return 'mortgage';
  if (s.includes('student loan')) return 'student_loan';
  if (s.includes('auto loan'))    return 'auto_loan';
  if (s.includes('personal loan'))return 'personal_loan';
  if (s.includes('credit card'))  return 'credit_card';
  if (s.includes('tax') || s.includes('real estate tax')) return 'tax_debt';
  if (s.includes('judgment'))     return 'judgment';
  if (s.includes('settlement'))   return 'settlement';
  if (s.includes('collections'))  return 'collections';
  if (s.includes('bnpl') || s.includes('installment')) return 'bnpl';
  throw new Error(`Unmapped account type: "${raw}" — add it to normalizeAccountType()`);
}

function normalizeAccountStatus(raw: string): AccountStatus {
  const s = raw.toLowerCase();
  if (s.includes('paid off'))       return 'paid_off';
  if (s.includes('charged off'))    return 'charged_off';
  if (s.includes('in collections')) return 'in_collections';
  if (s.includes('delinquent'))     return 'delinquent';
  if (s.includes('judgment'))       return 'judgment';
  if (s.includes('settled'))        return 'settled';
  // Covers "Active", "Current", "Active — <qualifier>", "Active — over limit", etc.
  return 'active';
}

// ── Frequency normalization ──────────────────────────────────────────────────

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'every_4_weeks' | 'annually' | 'one_time';

function normalizeCashflowFrequency(raw: string): Frequency {
  const s = raw.toLowerCase().trim();
  if (s === 'weekly')        return 'weekly';
  if (s === 'biweekly')      return 'biweekly';
  if (s === 'monthly')       return 'monthly';
  if (s === 'every 4 weeks') return 'every_4_weeks';
  if (s === 'annually')      return 'annually';
  if (s === 'one time' || s === 'one_time') return 'one_time';
  throw new Error(`Unknown cashflow frequency: "${raw}"`);
}

// Budget CSV uses frequencyNumber + frequencyPeriod (e.g. "2", "Weeks")
function normalizeBudgetFrequency(num: string, period: string): { frequency: Frequency; payments_per_year: number } {
  const n = parseInt(num);
  const p = period.toLowerCase().trim();
  if (p === 'weeks') {
    if (n === 1) return { frequency: 'weekly',        payments_per_year: 52 };
    if (n === 2) return { frequency: 'biweekly',      payments_per_year: 26 };
    if (n === 4) return { frequency: 'every_4_weeks', payments_per_year: 13 };
  }
  if (p === 'months') {
    if (n === 1)  return { frequency: 'monthly',  payments_per_year: 12 };
    if (n === 12) return { frequency: 'annually', payments_per_year: 1 };
  }
  throw new Error(`Unknown budget frequency: ${num} ${period}`);
}

// ── cashflow_id → budget_item_id mapping ────────────────────────────────────
// Maps each cashflow_id (from cashflow CSV) to its corresponding budget_item_id
// (from budget CSV). Use null for cashflow items with no budget counterpart yet.
//
// The budget_item_id for a row is slug(name) from the budget CSV —
// e.g. "My Loan Payment" → "my_loan_payment".

const CASHFLOW_TO_BUDGET_ITEM: Record<string, string | null> = {
  // 'my_income_id':   'my_income_budget_item_id',
  // 'my_rent_id':     'rent',
  // 'my_loan_id':     'loan_payment',
  // 'my_misc_id':     null,  // no budget item yet — will be unmatched
};

// ── Seed functions ───────────────────────────────────────────────────────────

function seedBudgetCategories(budgetRows: Record<string, string>[]): void {
  const seen = new Set<string>();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO budget_categories (category_id, name, display_order)
    VALUES (?, ?, ?)
  `);

  let order = 0;
  // Income first, then the rest in CSV appearance order
  const sorted = [
    ...budgetRows.filter(r => r.category === 'Income'),
    ...budgetRows.filter(r => r.category !== 'Income'),
  ];

  for (const row of sorted) {
    const cat = row.category;
    if (seen.has(cat)) continue;
    seen.add(cat);
    stmt.run(slug(cat), cat, order++);
  }
  console.log(`  budget_categories: ${seen.size} rows`);
}

function seedBudgetItems(budgetRows: Record<string, string>[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO budget_items (budget_item_id, category_id, name, expected_amount, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const row of budgetRows) {
    stmt.run(
      slug(row.name),
      slug(row.category),
      row.name,
      parseAmount(row.amount),
      row.notes || null,
    );
    count++;
  }
  console.log(`  budget_items: ${count} rows`);
}

function seedAccounts(accountRows: Record<string, string>[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO accounts (
      account_id, creditor, account_type, status,
      original_amount, current_balance, balance_date,
      interest_rate_pct, account_number, portal_url,
      payoff_date_est, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const row of accountRows) {
    stmt.run(
      row.account_id,
      row.creditor,
      normalizeAccountType(row.type),
      normalizeAccountStatus(row.status),
      parseAmount(row.original_amount),
      parseAmount(row.current_balance),
      row.balance_date || null,
      parseAmount(row.interest_rate_pct),
      row.account_number || null,
      row.portal || null,
      row.payoff_date_est || null,
      row.notes || null,
    );
    count++;
  }
  console.log(`  accounts: ${count} rows`);
}

function seedCashflowItems(cashflowRows: Record<string, string>[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cashflow_items (
      cashflow_item_id, budget_item_id, account_id, name,
      amount, frequency, payments_per_year, effective_monthly,
      is_active, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  let count = 0;
  const unmatched: string[] = [];

  for (const row of cashflowRows) {
    const amount = parseAmount(row.amount) ?? 0;
    const payments_per_year = parseFloat(row.payments_per_year);
    // Recalculate with correct sign (CSV stores effective_monthly as always-positive)
    const effective_monthly = amount * payments_per_year / 12;
    const budget_item_id = CASHFLOW_TO_BUDGET_ITEM[row.cashflow_id] ?? null;

    if (!(row.cashflow_id in CASHFLOW_TO_BUDGET_ITEM)) {
      unmatched.push(row.cashflow_id);
    }

    stmt.run(
      row.cashflow_id,
      budget_item_id,
      row.account_id || null,
      row.name,
      amount,
      normalizeCashflowFrequency(row.frequency),
      payments_per_year,
      effective_monthly,
      row.notes || null,
    );
    count++;
  }

  console.log(`  cashflow_items: ${count} rows`);
  if (unmatched.length) {
    console.warn(`  ⚠ cashflow items not in CASHFLOW_TO_BUDGET_ITEM mapping: ${unmatched.join(', ')}`);
    console.warn('    Add them to CASHFLOW_TO_BUDGET_ITEM in seed.ts (or set to null if no budget item yet)');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const budgetRows   = readCsv(CSV_BUDGET);
const accountRows  = readCsv(CSV_ACCOUNTS);
const cashflowRows = readCsv(CSV_CASHFLOW);

console.log('Seeding...');
db.transaction(() => {
  seedBudgetCategories(budgetRows);
  seedBudgetItems(budgetRows);
  seedAccounts(accountRows);
  seedCashflowItems(cashflowRows);
})();
console.log('Done.');
