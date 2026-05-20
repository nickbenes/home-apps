-- Migration 002: rename cashflow_items → recurring_items
-- "cashflow" was ambiguous (confused with cashflow as a financial concept);
-- "recurring" better describes the table's purpose: templates for repeating income and bills.

-- Drop views and index that reference the old table name
DROP VIEW IF EXISTS active_cashflow_items;
DROP VIEW IF EXISTS monthly_outflow_by_category;
DROP INDEX IF EXISTS idx_cashflow_items_active;

-- Rename table and columns
ALTER TABLE cashflow_items RENAME TO recurring_items;
ALTER TABLE recurring_items RENAME COLUMN cashflow_item_id TO recurring_item_id;
ALTER TABLE scheduled_payments RENAME COLUMN cashflow_item_id TO recurring_item_id;

-- Recreate index
CREATE INDEX idx_recurring_items_active
  ON recurring_items(is_active, projected_start_date, projected_stop_date);

-- Recreate views with updated references
CREATE VIEW active_recurring_items AS
SELECT *
FROM recurring_items
WHERE is_active = 1
  AND (projected_start_date IS NULL OR projected_start_date <= date('now'))
  AND (projected_stop_date  IS NULL OR projected_stop_date  >= date('now'));

CREATE VIEW monthly_outflow_by_category AS
SELECT
  bc.category_id,
  bc.name          AS category_name,
  SUM(ri.effective_monthly) AS total_effective_monthly
FROM recurring_items ri
JOIN budget_items bi ON ri.budget_item_id = bi.budget_item_id
JOIN budget_categories bc ON bi.category_id = bc.category_id
WHERE ri.is_active = 1 AND ri.amount < 0
GROUP BY bc.category_id, bc.name;
