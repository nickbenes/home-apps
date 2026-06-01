-- Migration 002: classification rules engine
-- Rules are matched against merchant_text or merchant_normalized on transactions.
-- First matching rule (by priority DESC) wins; manual classifications always take precedence.

CREATE TABLE classification_rules (
  rule_id        TEXT PRIMARY KEY,
  pattern        TEXT NOT NULL,
  match_field    TEXT NOT NULL DEFAULT 'merchant_normalized'
                   CHECK (match_field IN ('merchant_normalized', 'merchant_text')),
  match_type     TEXT NOT NULL DEFAULT 'contains'
                   CHECK (match_type IN ('contains', 'starts_with', 'exact')),
  budget_item_id TEXT NOT NULL REFERENCES budget_items(budget_item_id),
  confidence     TEXT NOT NULL DEFAULT 'auto_high'
                   CHECK (confidence IN ('auto_high', 'auto_medium', 'auto_low')),
  priority       INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  source         TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'rocketmoney_category', 'seeded')),
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rules_active_priority
  ON classification_rules(is_active, priority DESC);
