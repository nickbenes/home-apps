-- One-time projected income/expense items (ad-hoc future cash flows).
CREATE TABLE IF NOT EXISTS forecast_items (
  forecast_item_id TEXT PRIMARY KEY,
  name             TEXT    NOT NULL,
  amount           REAL    NOT NULL,  -- negative = expense, positive = income
  item_date        TEXT    NOT NULL,  -- ISO 8601 date
  account_id       TEXT    REFERENCES accounts(account_id),
  notes            TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_forecast_items_date ON forecast_items (item_date);
