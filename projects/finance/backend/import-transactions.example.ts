// import-transactions.example.ts — Version-controlled template for the RocketMoney importer.
// Copy to import-transactions.ts (which is gitignored) and fill in ACCOUNT_MAP.
//
// Run with: npm run db:import [path/to/RocketMoney_export.csv]
// If no path given, finds the latest RocketMoney_export_*.csv in PRIVATE-financial-csv/.
//
// What this does:
//   1. Reads a RocketMoney CSV export
//   2. Ensures source bank accounts exist in the accounts table (INSERT OR IGNORE)
//   3. Generates a deterministic transaction_id for each row (for deduplication)
//   4. Inserts new transactions; skips rows that already exist
//   5. Tags every inserted transaction with RocketMoney:<category> (e.g. RocketMoney:Coffee)
//   6. Auto-classifies inserted transactions using CATEGORY_MAP (RocketMoney category → budget item)
//   7. Runs the classification rules engine on any remaining unclassified transactions
//   8. Reports: inserted / tagged / classified / skipped counts

import { getDb } from './db.js';
import { applyRules } from './classify.js';
import { parse } from 'csv-parse/sync';
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(import.meta.dirname, '../data/PRIVATE-financial-csv');
const db = getDb();

// ── Account map ──────────────────────────────────────────────────────────────
// Maps RocketMoney source accounts to account_ids in our accounts table.
// Key format: "${Account Name}|${Account Number}" — matches the CSV fields exactly.
// Accounts listed here are created in the accounts table on first import (INSERT OR IGNORE).

const ACCOUNT_MAP: Record<string, { account_id: string; creditor: string }> = {
  // 'My Checking|1234':       { account_id: 'bank_checking_1234', creditor: 'My Bank' },
  // 'My Savings|5678':        { account_id: 'bank_savings_5678',  creditor: 'My Bank' },
  // 'Personal Profile|':      { account_id: 'venmo',              creditor: 'Venmo' },
  // 'Save for an Emergency|': { account_id: 'rm_savings',         creditor: 'Rocket Money' },
};

// ── RocketMoney category → budget_item_id ────────────────────────────────────
// Conservative: only map categories that clearly correspond to one budget item.
// Ambiguous categories (Loan Payment, Bills & Utilities, Shopping) are better
// left to the rules engine, which can match by merchant name.
//
// To find your budget_item_ids: SELECT budget_item_id, name FROM budget_items;
const CATEGORY_MAP: Record<string, string> = {
  // 'Coffee':               'coffee',
  // 'Amazon':               'amazon',
  // "Farmers' Market":      'farmers_mkt',
  // 'Door Dash':            'doordash',
  // 'Pets':                 'pets',
  // 'Medical':              'doc_dent',
  // 'Health & Wellness':    'supplements',
  // 'Charitable Donations': 'giving',
  // 'Groceries':            'food_clothes',
  // 'Dining & Drinks':      'food_clothes',
  // 'Fast Food & Pizza':    'drive_thru',
  // 'Personal Care':        'barber',
  // 'Entertainment & Rec.': 'apple_games',
  // 'Software & Tech':      'apple_games',
  // 'Auto & Transport':     'gas_auto',
  // 'Education':            'school_lunches',
  // 'Income':               'trinet',
};

// ── Skip rules ───────────────────────────────────────────────────────────────
// Rows in these RocketMoney categories are not imported — they're inter-account
// moves or noise, not real cashflow. Adjust to taste.
const SKIP_CATEGORIES = new Set([
  'Internal Transfers',
  'Savings Transfer',
  'Credit Card Payment',
  'Cash & Checks',
  'Personal Borrowing',
  'Uncategorized',
]);

// Normalises a RocketMoney category string into a tag-safe value.
// e.g. "Farmers' Market" → "Farmers_Market", "Bills & Utilities" → "Bills_and_Utilities"
function normalizeCategory(cat: string): string {
  return cat.trim()
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .replace(/\s+/g, '_');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readCsv(filepath: string): Record<string, string>[] {
  const content = fs.readFileSync(filepath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function findLatestExport(): string {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('RocketMoney_export') && f.endsWith('.csv'))
    .sort()
    .reverse();
  if (!files.length) throw new Error(`No RocketMoney export CSV found in ${DATA_DIR}`);
  return path.join(DATA_DIR, files[0]);
}

// Deterministic ID from fields that should be stable across re-exports of the same transaction.
// Using SHA-256 so re-importing the same CSV is always a no-op.
function makeTransactionId(row: Record<string, string>): string {
  const key = [
    row['Date'],
    row['Amount'],
    row['Account Number'] || row['Account Name'],
    row['Name'],
  ].join('|');
  return 'rm_' + createHash('sha256').update(key).digest('hex').slice(0, 32);
}

// Derive a human-readable batch ID from the export filename date.
// e.g. "RocketMoney_export_YTD-2026-05-13T..." → "rm_2026-05-13"
function makeBatchId(filepath: string): string {
  const match = path.basename(filepath).match(/(\d{4}-\d{2}-\d{2})/);
  return match ? `rm_${match[1]}` : `rm_${new Date().toISOString().slice(0, 10)}`;
}

function lookupAccount(row: Record<string, string>): { account_id: string; creditor: string } | null {
  const key = `${row['Account Name']}|${row['Account Number']}`;
  return ACCOUNT_MAP[key] ?? null;
}

// ── Source account seeding ───────────────────────────────────────────────────
// Creates account rows for source bank accounts if they don't already exist.
// INSERT OR IGNORE means running again after accounts are already seeded is safe.

function ensureSourceAccounts(rows: Record<string, string>[]): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO accounts (account_id, creditor, account_type, status)
    VALUES (?, ?, 'income_source', 'active')
  `);

  const seen = new Set<string>();
  for (const row of rows) {
    const acct = lookupAccount(row);
    if (!acct || seen.has(acct.account_id)) continue;
    seen.add(acct.account_id);
    stmt.run(acct.account_id, acct.creditor);
  }

  if (seen.size) console.log(`  Source accounts ensured: ${[...seen].join(', ')}`);
}

// ── Transaction import ───────────────────────────────────────────────────────

function importRows(rows: Record<string, string>[], batchId: string): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (
      transaction_id, account_id, transaction_date, posted_date,
      amount, merchant_text, merchant_normalized,
      transaction_type, source, import_batch_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv_import', ?)
  `);

  let inserted = 0, skippedDupe = 0, skippedCategory = 0, skippedNoAccount = 0;
  const insertedRows: { txId: string; category: string; amount: number }[] = [];

  // ── Pass 1: insert transactions ───────────────────────────────────────────
  db.transaction(() => {
    for (const row of rows) {
      if (SKIP_CATEGORIES.has(row['Category'])) { skippedCategory++; continue; }

      const acct = lookupAccount(row);
      if (!acct) {
        skippedNoAccount++;
        console.warn(`  ⚠ No ACCOUNT_MAP entry for: "${row['Account Name']}|${row['Account Number']}" — add to ACCOUNT_MAP`);
        continue;
      }

      const txId   = makeTransactionId(row);
      // RocketMoney: positive = spending/debit, negative = income/credit
      // Our schema: negative = outflow, positive = income — negate
      const amount = -parseFloat(row['Amount']);
      const result = insert.run(
        txId, acct.account_id,
        row['Original Date'] || row['Date'], row['Date'],
        amount,
        row['Description'] || row['Name'],
        row['Custom Name']  || row['Name'],
        amount < 0 ? 'debit' : 'credit',
        batchId,
      );

      if (result.changes > 0) {
        inserted++;
        insertedRows.push({ txId, category: row['Category'] ?? '', amount });
      } else {
        skippedDupe++;
      }
    }
  })();

  const insertedIds = insertedRows.map(r => r.txId);

  // ── Pass 2: tag every new transaction with its RocketMoney category ────────
  // Produces tags like RocketMoney:Coffee, RocketMoney:Groceries, etc.
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (tag_id, entity_type, entity_id, tag_name)
    VALUES (?, 'transaction', ?, ?)
  `);
  let tagged = 0;
  db.transaction(() => {
    for (const { txId, category } of insertedRows) {
      if (!category) continue;
      const norm = normalizeCategory(category);
      if (!norm) continue;
      const result = insertTag.run(randomUUID(), txId, `RocketMoney:${norm}`);
      if (result.changes > 0) tagged++;
    }
  })();

  // ── Pass 3: classify by RocketMoney category map ───────────────────────────
  const insertMapping = db.prepare(`
    INSERT OR IGNORE INTO transaction_budget_item_mappings
      (mapping_id, transaction_id, budget_item_id, allocated_amount, confidence, classified_by)
    VALUES (?, ?, ?, ?, 'auto_medium', 'import')
  `);
  let classifiedByCategory = 0;
  db.transaction(() => {
    for (const { txId, category, amount } of insertedRows) {
      const budgetItemId = CATEGORY_MAP[category];
      if (!budgetItemId) continue;
      const result = insertMapping.run(randomUUID(), txId, budgetItemId, amount);
      if (result.changes > 0) classifiedByCategory++;
    }
  })();

  // ── Pass 4: rules engine on remaining unclassified ─────────────────────────
  const { classified: classifiedByRules } = applyRules(db, insertedIds);

  console.log(`  Inserted:                   ${inserted}`);
  console.log(`  Tagged (RocketMoney:*):     ${tagged}`);
  console.log(`  Classified (category map):  ${classifiedByCategory}`);
  console.log(`  Classified (rules engine):  ${classifiedByRules}`);
  console.log(`  Skipped (duplicate):        ${skippedDupe}`);
  console.log(`  Skipped (category filter):  ${skippedCategory}`);
  if (skippedNoAccount) console.warn(`  Skipped (no account map):   ${skippedNoAccount}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : findLatestExport();
console.log(`Importing: ${path.basename(csvPath)}`);

const rows    = readCsv(csvPath);
const batchId = makeBatchId(csvPath);
console.log(`Batch ID: ${batchId}  (${rows.length} rows in CSV)`);

ensureSourceAccounts(rows);
importRows(rows, batchId);
console.log('Done.');
