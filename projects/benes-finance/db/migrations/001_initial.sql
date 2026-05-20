-- Migration 001: initial schema
-- Benes Finance — SQLite via better-sqlite3
--
-- Table creation order respects FK dependencies:
--   accounts, budget_categories → budget_items → cashflow_items
--   accounts → transactions → scheduled_payments
--   transactions + budget_items → transaction_budget_item_mappings
--   classification_audit_log (no FK constraints; append-only log)
--
-- All dates: ISO 8601 TEXT ('2026-05-19' or '2026-05-19T00:00:00')
-- All amounts: REAL; negative = outflow, positive = income
-- Enable FK enforcement at connection time: PRAGMA foreign_keys = ON

-- ============================================================
-- ACCOUNTS
-- One row per creditor/account relationship
-- ============================================================
CREATE TABLE accounts (
  account_id          TEXT PRIMARY KEY,
  -- e.g. 'my_bank', 'lender_a', 'lender_b'
  creditor            TEXT NOT NULL,
  account_type        TEXT NOT NULL CHECK (account_type IN (
                        'personal_loan', 'mortgage', 'credit_card',
                        'student_loan', 'tax_debt', 'auto_loan',
                        'settlement', 'collections', 'judgment',
                        'bnpl', 'income_source')),
  status              TEXT NOT NULL CHECK (status IN (
                        'active', 'delinquent', 'paid_off',
                        'charged_off', 'in_collections',
                        'judgment', 'settled')),
  original_amount     REAL,
  current_balance     REAL,
  balance_date        TEXT,                      -- ISO 8601
  interest_rate_pct   REAL,
  account_number      TEXT,
  portal_url          TEXT,
  payoff_date_est     TEXT,                      -- ISO 8601
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BUDGET CATEGORIES
-- Top-level groupings (Food, Auto, Debts, Kids, etc.)
-- ============================================================
CREATE TABLE budget_categories (
  category_id         TEXT PRIMARY KEY,          -- e.g. 'food', 'debts', 'auto'
  name                TEXT NOT NULL,
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BUDGET ITEMS
-- Named line items within a category; classification targets for transactions
-- ============================================================
CREATE TABLE budget_items (
  budget_item_id      TEXT PRIMARY KEY,
  -- e.g. 'groceries', 'lender_payment'
  category_id         TEXT NOT NULL REFERENCES budget_categories(category_id),
  name                TEXT NOT NULL,
  expected_amount     REAL,                      -- typical amount per occurrence
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- CASHFLOW ITEMS
-- Recurring templates: income, fixed bills, debt payments
-- Temporal bounds: only active between projected_start/stop dates
-- ============================================================
CREATE TABLE cashflow_items (
  cashflow_item_id      TEXT PRIMARY KEY,        -- e.g. 'lender_payment', 'employer_income'
  budget_item_id        TEXT REFERENCES budget_items(budget_item_id),
  account_id            TEXT REFERENCES accounts(account_id),
  name                  TEXT NOT NULL,
  amount                REAL NOT NULL,           -- negative = outflow, positive = income
  frequency             TEXT NOT NULL CHECK (frequency IN (
                           'weekly', 'biweekly', 'monthly',
                           'every_4_weeks', 'annually', 'one_time')),
  payments_per_year     REAL NOT NULL,           -- 52 | 26 | 12 | 13 | 1 | etc.
  effective_monthly     REAL NOT NULL,           -- amount * (payments_per_year / 12)
  projected_start_date  TEXT,                    -- ISO 8601; NULL = already active
  projected_stop_date   TEXT,                    -- ISO 8601; NULL = indefinite
  is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TRANSACTIONS
-- Immutable once ingested — ground truth from bank/card feeds
-- No updated_at: these rows never change after INSERT
-- ============================================================
CREATE TABLE transactions (
  transaction_id      TEXT PRIMARY KEY,          -- UUID or bank-provided ID
  account_id          TEXT NOT NULL REFERENCES accounts(account_id),
  transaction_date    TEXT NOT NULL,             -- ISO 8601
  posted_date         TEXT,                      -- ISO 8601; may differ from transaction_date
  amount              REAL NOT NULL,             -- negative = debit, positive = credit
  merchant_text       TEXT NOT NULL,             -- raw text from bank/RocketMoney
  merchant_normalized TEXT,                      -- cleaned version
  transaction_type    TEXT CHECK (transaction_type IN ('debit', 'credit', 'transfer', 'fee')),
  source              TEXT NOT NULL CHECK (source IN ('manual', 'csv_import', 'api')),
  import_batch_id     TEXT,                      -- ties rows to a specific CSV import run
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SCHEDULED PAYMENTS
-- Projected future instances of a CashflowItem
-- Generated from the template; linked to actual transaction once posted
-- ============================================================
CREATE TABLE scheduled_payments (
  scheduled_payment_id  TEXT PRIMARY KEY,
  cashflow_item_id      TEXT NOT NULL REFERENCES cashflow_items(cashflow_item_id),
  account_id            TEXT REFERENCES accounts(account_id),
  due_date              TEXT NOT NULL,           -- ISO 8601
  amount                REAL NOT NULL,           -- may differ from template (e.g. final payoff)
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                           'pending', 'scheduled', 'past_due',
                           'completed', 'postponed', 'cancelled')),
  actual_transaction_id TEXT REFERENCES transactions(transaction_id),
  postponed_from_date   TEXT,                    -- original due date if postponed
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TRANSACTION → BUDGET ITEM MAPPINGS
-- Many-to-many; supports splits (one transaction → multiple budget items)
-- Mutable classification layer — changes are tracked in audit log
-- ============================================================
CREATE TABLE transaction_budget_item_mappings (
  mapping_id          TEXT PRIMARY KEY,
  transaction_id      TEXT NOT NULL REFERENCES transactions(transaction_id),
  budget_item_id      TEXT NOT NULL REFERENCES budget_items(budget_item_id),
  allocated_amount    REAL NOT NULL,             -- portion assigned here (split support)
  confidence          TEXT NOT NULL DEFAULT 'manual' CHECK (confidence IN (
                         'auto_high', 'auto_medium', 'auto_low',
                         'manual', 'manual_override')),
  classified_by       TEXT CHECK (classified_by IN ('user', 'rule', 'ml', 'import')),
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- CLASSIFICATION AUDIT LOG
-- Append-only history of changes to transaction_budget_item_mappings
-- mapping_id is stored as TEXT (not FK) so log survives mapping deletion
-- ============================================================
CREATE TABLE classification_audit_log (
  log_id                TEXT PRIMARY KEY,
  mapping_id            TEXT NOT NULL,
  transaction_id        TEXT NOT NULL,
  budget_item_id        TEXT NOT NULL,
  action                TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_budget_item_id    TEXT,
  old_allocated_amount  REAL,
  new_allocated_amount  REAL,
  changed_by            TEXT CHECK (changed_by IN ('user', 'rule', 'import')),
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_account_date
  ON transactions(account_id, transaction_date);

CREATE INDEX idx_transactions_date
  ON transactions(transaction_date);

CREATE INDEX idx_mappings_transaction
  ON transaction_budget_item_mappings(transaction_id);

CREATE INDEX idx_mappings_budget_item
  ON transaction_budget_item_mappings(budget_item_id);

CREATE INDEX idx_scheduled_payments_due_date
  ON scheduled_payments(due_date);

CREATE INDEX idx_scheduled_payments_status
  ON scheduled_payments(status);

CREATE INDEX idx_cashflow_items_active
  ON cashflow_items(is_active, projected_start_date, projected_stop_date);

-- ============================================================
-- VIEWS
-- ============================================================

-- Transactions with no budget item assigned
CREATE VIEW unmatched_transactions AS
SELECT t.*
FROM transactions t
LEFT JOIN transaction_budget_item_mappings m ON t.transaction_id = m.transaction_id
WHERE m.mapping_id IS NULL;

-- Monthly effective outflow by category (from cashflow templates, not actuals)
CREATE VIEW monthly_outflow_by_category AS
SELECT
  bc.category_id,
  bc.name          AS category_name,
  SUM(cf.effective_monthly) AS total_effective_monthly
FROM cashflow_items cf
JOIN budget_items bi ON cf.budget_item_id = bi.budget_item_id
JOIN budget_categories bc ON bi.category_id = bc.category_id
WHERE cf.is_active = 1 AND cf.amount < 0
GROUP BY bc.category_id, bc.name;

-- Active cashflow items as of today
CREATE VIEW active_cashflow_items AS
SELECT *
FROM cashflow_items
WHERE is_active = 1
  AND (projected_start_date IS NULL OR projected_start_date <= date('now'))
  AND (projected_stop_date  IS NULL OR projected_stop_date  >= date('now'));
