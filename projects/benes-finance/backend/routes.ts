import { Router } from 'express';
import { randomUUID } from 'crypto';
import type BetterSqlite3 from 'better-sqlite3';
import { applyRules } from './classify.js';

// ── Scheduling helpers (pure, no DB dependency) ──────────────────────────────

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

function nextOccurrence(dateStr: string, frequency: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  switch (frequency) {
    case 'weekly':        return localDate(new Date(y, m - 1, d + 7));
    case 'biweekly':      return localDate(new Date(y, m - 1, d + 14));
    case 'every_4_weeks': return localDate(new Date(y, m - 1, d + 28));
    case 'monthly':       return localDate(new Date(y, m,     d));     // m (not m-1) advances month
    case 'annually':      return localDate(new Date(y + 1, m - 1, d));
    default:              return '9999-12-31';                          // one_time sentinel
  }
}

function projectDates(item: {
  projected_start_date: string | null;
  projected_stop_date: string | null;
  created_at: string;
  frequency: string;
}, from: string, to: string): string[] {
  if (item.frequency === 'one_time') {
    const d = item.projected_start_date;
    return d && d >= from && d <= to ? [d] : [];
  }
  // Use projected_start_date as anchor; fall back to the date portion of created_at
  let cur = item.projected_start_date ?? item.created_at.slice(0, 10);
  const stop = item.projected_stop_date;

  // Advance to first occurrence >= from
  while (cur < from) cur = nextOccurrence(cur, item.frequency);

  const dates: string[] = [];
  while (cur <= to) {
    if (stop && cur > stop) break;
    dates.push(cur);
    const next = nextOccurrence(cur, item.frequency);
    if (next <= cur) break;  // safety guard against infinite loop
    cur = next;
  }
  return dates;
}

const PAYMENTS_PER_YEAR: Record<string, number> = {
  weekly: 52, biweekly: 26, monthly: 12, every_4_weeks: 13, annually: 1, one_time: 1,
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item';
}

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
    const ALLOWED = ['current_balance', 'balance_date', 'interest_rate_pct', 'status', 'notes'] as const;
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

  router.get('/budget/variance', (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }
    const [y, m] = month.split('-').map(Number);
    const monthStart = `${month}-01`;
    const monthEnd   = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`;

    const rows = db.prepare(`
      WITH budgeted AS (
        SELECT
          bi.budget_item_id,
          bi.name            AS item_name,
          bc.category_id,
          bc.name            AS category_name,
          bc.display_order,
          ABS(COALESCE(SUM(ri.effective_monthly), 0)) AS budgeted_monthly
        FROM budget_items bi
        JOIN budget_categories bc ON bi.category_id = bc.category_id
        LEFT JOIN recurring_items ri
          ON ri.budget_item_id = bi.budget_item_id
         AND ri.is_active = 1
         AND ri.amount < 0
        GROUP BY bi.budget_item_id, bi.name, bc.category_id, bc.name, bc.display_order
      ),
      actuals AS (
        SELECT
          m.budget_item_id,
          ABS(SUM(m.allocated_amount)) AS actual_amount,
          COUNT(DISTINCT m.transaction_id)  AS tx_count
        FROM transaction_budget_item_mappings m
        JOIN transactions t ON m.transaction_id = t.transaction_id
        WHERE t.transaction_date >= ? AND t.transaction_date < ?
        GROUP BY m.budget_item_id
      )
      SELECT
        b.budget_item_id,
        b.item_name,
        b.category_id,
        b.category_name,
        b.display_order,
        b.budgeted_monthly,
        COALESCE(a.actual_amount, 0) AS actual_amount,
        COALESCE(a.tx_count, 0)      AS tx_count
      FROM budgeted b
      LEFT JOIN actuals a ON b.budget_item_id = a.budget_item_id
      WHERE b.budgeted_monthly > 0 OR COALESCE(a.actual_amount, 0) > 0
      ORDER BY b.display_order, b.item_name
    `).all(monthStart, monthEnd) as {
      budget_item_id: string; item_name: string;
      category_id: string; category_name: string; display_order: number;
      budgeted_monthly: number; actual_amount: number; tx_count: number;
    }[];

    // Group flat rows into categories
    const catMap = new Map<string, {
      category_id: string; category_name: string; display_order: number;
      budgeted: number; actual: number;
      items: typeof rows;
    }>();
    for (const r of rows) {
      if (!catMap.has(r.category_id)) {
        catMap.set(r.category_id, {
          category_id: r.category_id, category_name: r.category_name,
          display_order: r.display_order, budgeted: 0, actual: 0, items: [],
        });
      }
      const cat = catMap.get(r.category_id)!;
      cat.budgeted += r.budgeted_monthly;
      cat.actual   += r.actual_amount;
      cat.items.push(r);
    }

    res.json({
      month,
      categories: [...catMap.values()].sort((a, b) => a.display_order - b.display_order),
    });
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
  router.get('/recurring', (req, res) => {
    const rows = req.query.all === 'true'
      ? db.prepare('SELECT * FROM recurring_items ORDER BY frequency, name').all()
      : db.prepare('SELECT * FROM active_recurring_items ORDER BY frequency, name').all();
    res.json(rows);
  });

  router.post('/recurring', (req, res) => {
    const { name, amount, frequency, budget_item_id, account_id,
            projected_start_date, projected_stop_date, notes } = req.body;

    if (!name || amount == null || !frequency) {
      return res.status(400).json({ error: 'name, amount, and frequency are required' });
    }
    if (!(frequency in PAYMENTS_PER_YEAR)) {
      return res.status(400).json({ error: `Invalid frequency: ${frequency}` });
    }

    const ppy = PAYMENTS_PER_YEAR[frequency];
    const effective_monthly = amount * (ppy / 12);

    const base = slugify(name);
    const taken = db.prepare('SELECT 1 FROM recurring_items WHERE recurring_item_id = ?').get(base);
    const id = taken ? `${base}_${randomUUID().slice(0, 8)}` : base;

    db.prepare(`
      INSERT INTO recurring_items
        (recurring_item_id, name, amount, frequency, payments_per_year, effective_monthly,
         budget_item_id, account_id, projected_start_date, projected_stop_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, amount, frequency, ppy, effective_monthly,
           budget_item_id ?? null, account_id ?? null,
           projected_start_date ?? null, projected_stop_date ?? null, notes ?? null);

    res.status(201).json(db.prepare('SELECT * FROM recurring_items WHERE recurring_item_id = ?').get(id));
  });

  router.patch('/recurring/:id', (req, res) => {
    const ALLOWED = ['name', 'amount', 'frequency', 'budget_item_id', 'account_id',
      'projected_start_date', 'projected_stop_date', 'is_active', 'notes'] as const;

    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) {
      return res.status(400).json({ error: `No valid fields. Allowed: ${ALLOWED.join(', ')}` });
    }

    const current = db.prepare('SELECT * FROM recurring_items WHERE recurring_item_id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!current) return res.status(404).json({ error: 'Recurring item not found' });

    const updates = Object.fromEntries(entries);
    const newFreq = ('frequency' in updates ? updates.frequency : current.frequency) as string;
    if ('frequency' in updates && !(newFreq in PAYMENTS_PER_YEAR)) {
      return res.status(400).json({ error: `Invalid frequency: ${newFreq}` });
    }

    const newAmount = Number('amount' in updates ? updates.amount : current.amount);
    const ppy = PAYMENTS_PER_YEAR[newFreq];
    const effective_monthly = newAmount * (ppy / 12);

    const allEntries = [...entries, ['payments_per_year', ppy], ['effective_monthly', effective_monthly]];
    const sets = allEntries.map(([k]) => `${k} = ?`).join(', ');
    const vals = [...allEntries.map(([, v]) => v), req.params.id];

    db.prepare(
      `UPDATE recurring_items SET ${sets}, updated_at = datetime('now') WHERE recurring_item_id = ?`
    ).run(vals);

    res.json(db.prepare('SELECT * FROM recurring_items WHERE recurring_item_id = ?').get(req.params.id));
  });

  router.delete('/recurring/:id', (req, res) => {
    const item = db.prepare('SELECT 1 FROM recurring_items WHERE recurring_item_id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Recurring item not found' });
    db.prepare('DELETE FROM recurring_items WHERE recurring_item_id = ?').run(req.params.id);
    res.status(204).send();
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

  // ── Scheduled payments ──────────────────────────────────────────────────────

  // Projects due dates from active recurring items; no DB writes.
  // ?days=90 (1–365, default 90)
  router.get('/scheduled', (req, res) => {
    const days = Math.min(Math.max(parseInt((req.query.days as string) || '90'), 1), 365);
    const today = localDate();
    const end = addDays(today, days);

    // Include items that are active, haven't ended, and start before the window closes.
    // Intentionally bypasses the active_recurring_items view so items starting later this
    // week/month (projected_start_date > today) still appear in the schedule.
    const items = db.prepare(`
      SELECT ri.*, a.creditor
      FROM recurring_items ri
      LEFT JOIN accounts a ON ri.account_id = a.account_id
      WHERE ri.is_active = 1
        AND (ri.projected_stop_date  IS NULL OR ri.projected_stop_date  >= ?)
        AND (ri.projected_start_date IS NULL OR ri.projected_start_date <= ?)
    `).all(today, end) as any[];

    const result: object[] = [];
    for (const item of items) {
      for (const due_date of projectDates(item, today, end)) {
        result.push({
          recurring_item_id: item.recurring_item_id,
          name: item.name,
          due_date,
          amount: item.amount,
          frequency: item.frequency,
          account_id: item.account_id ?? null,
          creditor: item.creditor ?? null,
        });
      }
    }

    (result as any[]).sort((a, b) => a.due_date.localeCompare(b.due_date));
    res.json(result);
  });

  // ── Classification rules ─────────────────────────────────────────────────────

  router.get('/rules', (_req, res) => {
    const rows = db.prepare(`
      SELECT r.*, bi.name AS budget_item_name, bc.name AS category_name
      FROM classification_rules r
      JOIN budget_items bi ON r.budget_item_id = bi.budget_item_id
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      ORDER BY r.priority DESC, r.created_at ASC
    `).all();
    res.json(rows);
  });

  router.post('/rules', (req, res) => {
    const { pattern, match_field = 'merchant_normalized', match_type = 'contains',
            budget_item_id, confidence = 'auto_high', priority = 0, notes } = req.body;

    if (!pattern || !budget_item_id) {
      return res.status(400).json({ error: 'pattern and budget_item_id are required' });
    }
    const item = db.prepare('SELECT 1 FROM budget_items WHERE budget_item_id = ?').get(budget_item_id);
    if (!item) return res.status(400).json({ error: 'budget_item_id not found' });

    const id = randomUUID();
    db.prepare(`
      INSERT INTO classification_rules
        (rule_id, pattern, match_field, match_type, budget_item_id, confidence, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, pattern.trim(), match_field, match_type, budget_item_id, confidence, priority, notes ?? null);

    const row = db.prepare(`
      SELECT r.*, bi.name AS budget_item_name, bc.name AS category_name
      FROM classification_rules r
      JOIN budget_items bi ON r.budget_item_id = bi.budget_item_id
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      WHERE r.rule_id = ?
    `).get(id);
    res.status(201).json(row);
  });

  router.patch('/rules/:id', (req, res) => {
    const ALLOWED = ['pattern', 'match_field', 'match_type', 'budget_item_id',
                     'confidence', 'priority', 'is_active', 'notes'] as const;
    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) return res.status(400).json({ error: `Allowed fields: ${ALLOWED.join(', ')}` });

    const rule = db.prepare('SELECT 1 FROM classification_rules WHERE rule_id = ?').get(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(
      `UPDATE classification_rules SET ${sets}, updated_at = datetime('now') WHERE rule_id = ?`
    ).run([...entries.map(([, v]) => v), req.params.id]);

    res.json(db.prepare(`
      SELECT r.*, bi.name AS budget_item_name, bc.name AS category_name
      FROM classification_rules r
      JOIN budget_items bi ON r.budget_item_id = bi.budget_item_id
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      WHERE r.rule_id = ?
    `).get(req.params.id));
  });

  router.delete('/rules/:id', (req, res) => {
    const rule = db.prepare('SELECT 1 FROM classification_rules WHERE rule_id = ?').get(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    db.prepare('DELETE FROM classification_rules WHERE rule_id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Applies all active rules to every unclassified transaction.
  router.post('/rules/apply', (_req, res) => {
    const result = applyRules(db);
    res.json(result);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  router.get('/debt-priority', (_req, res) => {
    const rows = db.prepare(`
      SELECT
        a.account_id,
        a.creditor,
        a.account_type,
        a.status,
        a.current_balance,
        a.interest_rate_pct,
        a.balance_date,
        a.payoff_date_est,
        ABS(SUM(ri.effective_monthly)) AS monthly_payment
      FROM accounts a
      LEFT JOIN recurring_items ri
        ON ri.account_id = a.account_id AND ri.is_active = 1 AND ri.amount < 0
      WHERE a.account_type != 'income_source'
        AND a.status NOT IN ('paid_off', 'settled')
        AND a.current_balance IS NOT NULL
        AND a.current_balance > 0
      GROUP BY a.account_id
    `).all() as {
      account_id: string; creditor: string; account_type: string; status: string;
      current_balance: number; interest_rate_pct: number | null;
      balance_date: string | null; payoff_date_est: string | null;
      monthly_payment: number | null;
    }[];

    const today = new Date();
    const result = rows.map(r => {
      const rate = r.interest_rate_pct != null ? r.interest_rate_pct / 100 / 12 : null;
      const monthly_interest = rate != null ? r.current_balance * rate : null;
      const pmt = r.monthly_payment ?? 0;

      let months_to_payoff: number | null = null;
      if (pmt > 0) {
        if (rate == null || rate === 0) {
          months_to_payoff = r.current_balance / pmt;
        } else if (pmt > r.current_balance * rate) {
          months_to_payoff = -Math.log(1 - rate * r.current_balance / pmt) / Math.log(1 + rate);
        }
      }

      let payoff_date: string | null = null;
      if (months_to_payoff != null) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + Math.ceil(months_to_payoff));
        payoff_date = d.toISOString().slice(0, 7); // YYYY-MM
      }

      return { ...r, monthly_interest, months_to_payoff, payoff_date };
    });

    res.json(result);
  });

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
      monthly_recurring_by_category: monthlyCashflow,
      unmatched_transaction_count: unmatchedCount.count,
    });
  });

  return router;
}
