// Shared classification logic used by both routes (POST /rules/apply) and the importer CLI.
// Applies active rules to unclassified transactions; first matching rule by priority wins.
// Transactions that already have any mapping are skipped (manual always beats auto).

import { randomUUID } from 'crypto';
import type BetterSqlite3 from 'better-sqlite3';

interface Rule {
  rule_id: string;
  pattern: string;
  match_field: 'merchant_normalized' | 'merchant_text';
  match_type: 'contains' | 'starts_with' | 'exact';
  budget_item_id: string;
  confidence: string;
  priority: number;
}

interface Tx {
  transaction_id: string;
  amount: number;
  merchant_text: string;
  merchant_normalized: string | null;
}

function ruleMatches(rule: Rule, tx: Tx): boolean {
  const raw = rule.match_field === 'merchant_text'
    ? tx.merchant_text
    : (tx.merchant_normalized ?? tx.merchant_text);
  const text    = raw?.toLowerCase() ?? '';
  const pattern = rule.pattern.toLowerCase();
  switch (rule.match_type) {
    case 'contains':    return text.includes(pattern);
    case 'starts_with': return text.startsWith(pattern);
    case 'exact':       return text === pattern;
    default:            return false;
  }
}

export function applyRules(
  db: BetterSqlite3.Database,
  transactionIds?: string[],
): { classified: number; skipped: number } {
  const rules = db.prepare(`
    SELECT * FROM classification_rules
    WHERE is_active = 1
    ORDER BY priority DESC, created_at ASC
  `).all() as Rule[];

  if (!rules.length) return { classified: 0, skipped: 0 };

  // Fetch unclassified transactions: either all unmatched, or a specific subset.
  let txs: Tx[];
  if (transactionIds?.length) {
    const ph = transactionIds.map(() => '?').join(',');
    txs = db.prepare(`
      SELECT t.transaction_id, t.amount, t.merchant_text, t.merchant_normalized
      FROM transactions t
      WHERE t.transaction_id IN (${ph})
        AND NOT EXISTS (
          SELECT 1 FROM transaction_budget_item_mappings
          WHERE transaction_id = t.transaction_id
        )
    `).all(transactionIds) as Tx[];
  } else {
    txs = db.prepare(`
      SELECT transaction_id, amount, merchant_text, merchant_normalized
      FROM unmatched_transactions
    `).all() as Tx[];
  }

  if (!txs.length) return { classified: 0, skipped: 0 };

  const insert = db.prepare(`
    INSERT OR IGNORE INTO transaction_budget_item_mappings
      (mapping_id, transaction_id, budget_item_id, allocated_amount, confidence, classified_by)
    VALUES (?, ?, ?, ?, ?, 'rule')
  `);

  let classified = 0;
  db.transaction(() => {
    for (const tx of txs) {
      for (const rule of rules) {
        if (ruleMatches(rule, tx)) {
          insert.run(randomUUID(), tx.transaction_id, rule.budget_item_id, tx.amount, rule.confidence);
          classified++;
          break;
        }
      }
    }
  })();

  return { classified, skipped: txs.length - classified };
}
