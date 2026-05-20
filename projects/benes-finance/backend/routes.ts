import { Router } from 'express';
import { randomUUID } from 'crypto';
import type BetterSqlite3 from 'better-sqlite3';

export function createRouter(db: BetterSqlite3.Database): Router {
  const router = Router();

  // ── Accounts ────────────────────────────────────────────────────────────────

  router.get('/accounts', (_req, res) => {
    const rows = db.prepare('SELECT * FROM accounts ORDER BY account_type, creditor').all();
    res.json(rows);
  });

  router.get('/accounts/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    res.json(row);
  });

  // Only updates fields present in the request body; supports explicit null to clear a field.
  router.patch('/accounts/:id', (req, res) => {
    const ALLOWED = ['current_balance', 'balance_date', 'status', 'notes'] as const;
    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) {
      return res.status(400).json({ error: `No valid fields. Allowed: ${ALLOWED.join(', ')}` });
    }
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const vals = [...entries.map(([, v]) => v), req.params.id];
    const result = db.prepare(
      `UPDATE accounts SET ${sets}, updated_at = datetime('now') WHERE account_id = ?`
    ).run(vals);
    if (result.changes === 0) return res.status(404).json({ error: 'Account not found' });
    res.json(db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.params.id));
  });

  // ── Budget ──────────────────────────────────────────────────────────────────

  router.get('/budget/categories', (_req, res) => {
    const rows = db.prepare('SELECT * FROM budget_categories ORDER BY display_order').all();
    res.json(rows);
  });

  router.get('/budget/items', (_req, res) => {
    const rows = db.prepare(`
      SELECT bi.*, bc.name AS category_name, bc.display_order AS category_display_order
      FROM budget_items bi
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      ORDER BY bc.display_order, bi.name
    `).all();
    res.json(rows);
  });

  // ── Cashflow ────────────────────────────────────────────────────────────────

  // ?all=true to include inactive items; default returns only active (via view)
  router.get('/cashflow', (req, res) => {
    const rows = req.query.all === 'true'
      ? db.prepare('SELECT * FROM cashflow_items ORDER BY frequency, name').all()
      : db.prepare('SELECT * FROM active_cashflow_items ORDER BY frequency, name').all();
    res.json(rows);
  });

  // ── Transactions ────────────────────────────────────────────────────────────

  // Supports: ?account_id= ?start= ?end= ?unmatched=true ?q= ?limit= ?offset=
  router.get('/transactions', (req, res) => {
    const { account_id, start, end, unmatched, q } = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt((req.query.limit as string) || '50'), 200);
    const offset = parseInt((req.query.offset as string) || '0');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (account_id)           { conditions.push('t.account_id = ?');                                           params.push(account_id); }
    if (start)                { conditions.push('t.transaction_date >= ?');                                     params.push(start); }
    if (end)                  { conditions.push('t.transaction_date <= ?');                                     params.push(end); }
    if (q)                    { conditions.push('(t.merchant_text LIKE ? OR t.merchant_normalized LIKE ?)');    params.push(`%${q}%`, `%${q}%`); }
    if (unmatched === 'true') { conditions.push('m.mapping_id IS NULL'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = db.prepare(`
      SELECT t.*, COUNT(m.mapping_id) AS mapping_count
      FROM transactions t
      LEFT JOIN transaction_budget_item_mappings m ON t.transaction_id = m.transaction_id
      ${where}
      GROUP BY t.transaction_id
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, limit, offset]);

    res.json(rows);
  });

  router.get('/transactions/:id', (req, res) => {
    const tx = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const mappings = db.prepare(`
      SELECT m.*, bi.name AS budget_item_name, bc.name AS category_name
      FROM transaction_budget_item_mappings m
      JOIN budget_items bi ON m.budget_item_id = bi.budget_item_id
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      WHERE m.transaction_id = ?
    `).all(req.params.id);

    res.json({ ...(tx as object), mappings });
  });

  // ── Classifications ─────────────────────────────────────────────────────────

  router.post('/transactions/:id/classify', (req, res) => {
    const { budget_item_id, allocated_amount, confidence = 'manual', notes } = req.body;

    if (!budget_item_id || allocated_amount == null) {
      return res.status(400).json({ error: 'budget_item_id and allocated_amount are required' });
    }

    const tx = db.prepare('SELECT transaction_id FROM transactions WHERE transaction_id = ?').get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const mappingId = randomUUID();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO transaction_budget_item_mappings
          (mapping_id, transaction_id, budget_item_id, allocated_amount, confidence, classified_by, notes)
        VALUES (?, ?, ?, ?, ?, 'user', ?)
      `).run(mappingId, req.params.id, budget_item_id, allocated_amount, confidence, notes ?? null);

      db.prepare(`
        INSERT INTO classification_audit_log
          (log_id, mapping_id, transaction_id, budget_item_id, action, new_allocated_amount, changed_by)
        VALUES (?, ?, ?, ?, 'created', ?, 'user')
      `).run(randomUUID(), mappingId, req.params.id, budget_item_id, allocated_amount);
    })();

    res.status(201).json(
      db.prepare('SELECT * FROM transaction_budget_item_mappings WHERE mapping_id = ?').get(mappingId)
    );
  });

  router.delete('/mappings/:id', (req, res) => {
    const mapping = db.prepare(
      'SELECT * FROM transaction_budget_item_mappings WHERE mapping_id = ?'
    ).get(req.params.id) as {
      mapping_id: string; transaction_id: string; budget_item_id: string; allocated_amount: number;
    } | undefined;

    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });

    db.transaction(() => {
      db.prepare('DELETE FROM transaction_budget_item_mappings WHERE mapping_id = ?').run(req.params.id);

      db.prepare(`
        INSERT INTO classification_audit_log
          (log_id, mapping_id, transaction_id, budget_item_id, action, old_allocated_amount, changed_by)
        VALUES (?, ?, ?, ?, 'deleted', ?, 'user')
      `).run(
        randomUUID(), mapping.mapping_id, mapping.transaction_id,
        mapping.budget_item_id, mapping.allocated_amount
      );
    })();

    res.status(204).send();
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  router.get('/summary', (_req, res) => {
    const totalDebt = db.prepare(`
      SELECT SUM(current_balance) AS total
      FROM accounts
      WHERE account_type NOT IN ('income_source')
        AND status NOT IN ('paid_off', 'settled', 'charged_off')
        AND current_balance IS NOT NULL
    `).get() as { total: number | null };

    const monthlyCashflow = db.prepare(`
      SELECT * FROM monthly_outflow_by_category ORDER BY total_effective_monthly
    `).all();

    const unmatchedCount = db.prepare(
      'SELECT COUNT(*) AS count FROM unmatched_transactions'
    ).get() as { count: number };

    res.json({
      total_debt: totalDebt.total,
      monthly_cashflow_by_category: monthlyCashflow,
      unmatched_transaction_count: unmatchedCount.count,
    });
  });

  return router;
}
