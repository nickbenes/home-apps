import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// __dirname is available here because Babel transforms ESM → CJS for Jest.
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

// Seeds the in-memory DB with synthetic fixture data.
// No real account names, creditors, or merchant data — safe to commit.
export function seedFixtures(db: Database.Database): void {
  db.transaction(() => {
    // Accounts
    db.prepare(`
      INSERT INTO accounts (account_id, creditor, account_type, status)
      VALUES ('test_checking', 'First Test Bank', 'income_source', 'active')
    `).run();

    db.prepare(`
      INSERT INTO accounts (account_id, creditor, account_type, status, current_balance, balance_date)
      VALUES ('test_loan', 'Sample Lender LLC', 'personal_loan', 'active', 5000.00, '2026-01-01')
    `).run();

    // Budget categories
    db.prepare(`INSERT INTO budget_categories (category_id, name, display_order) VALUES ('food', 'Food', 0)`).run();
    db.prepare(`INSERT INTO budget_categories (category_id, name, display_order) VALUES ('debts', 'Debts', 1)`).run();

    // Budget items
    db.prepare(`
      INSERT INTO budget_items (budget_item_id, category_id, name, expected_amount)
      VALUES ('groceries', 'food', 'Groceries', -400.00)
    `).run();
    db.prepare(`
      INSERT INTO budget_items (budget_item_id, category_id, name, expected_amount)
      VALUES ('loan_payment', 'debts', 'Sample Lender Payment', -200.00)
    `).run();

    // Cashflow item (active, no date bounds)
    db.prepare(`
      INSERT INTO cashflow_items
        (cashflow_item_id, budget_item_id, account_id, name, amount, frequency, payments_per_year, effective_monthly)
      VALUES ('loan_cf', 'loan_payment', 'test_loan', 'Sample Lender Payment', -200.00, 'monthly', 12, -200.00)
    `).run();

    // Transactions — all from test_checking; no real merchant names
    db.prepare(`
      INSERT INTO transactions
        (transaction_id, account_id, transaction_date, amount, merchant_text, merchant_normalized, transaction_type, source)
      VALUES ('tx_001', 'test_checking', '2026-05-01', -45.00, 'GROCERY STORE 001', 'Grocery Store', 'debit', 'csv_import')
    `).run();
    db.prepare(`
      INSERT INTO transactions
        (transaction_id, account_id, transaction_date, amount, merchant_text, transaction_type, source)
      VALUES ('tx_002', 'test_checking', '2026-05-05', -200.00, 'SAMPLE LENDER PAYMENT', 'debit', 'csv_import')
    `).run();
    db.prepare(`
      INSERT INTO transactions
        (transaction_id, account_id, transaction_date, amount, merchant_text, transaction_type, source)
      VALUES ('tx_003', 'test_checking', '2026-05-10', 2500.00, 'DIRECT DEPOSIT PAYROLL', 'credit', 'csv_import')
    `).run();
  })();
}
