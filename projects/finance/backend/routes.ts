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

  router.get('/accounts/:id/detail', (req, res) => {
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const tags = (db.prepare(
      `SELECT tag_name FROM tags WHERE entity_type = 'account' AND entity_id = ? ORDER BY tag_name`
    ).all(req.params.id) as { tag_name: string }[]).map(r => r.tag_name);

    const recurringItems = db.prepare(`
      SELECT ri.*, bi.name AS budget_item_name, bc.name AS category_name
      FROM recurring_items ri
      LEFT JOIN budget_items bi ON ri.budget_item_id = bi.budget_item_id
      LEFT JOIN budget_categories bc ON bi.category_id = bc.category_id
      WHERE ri.account_id = ?
      ORDER BY ri.is_active DESC, ri.name
    `).all(req.params.id);

    const budgetItems = db.prepare(`
      SELECT DISTINCT bi.budget_item_id, bi.name, bc.name AS category_name
      FROM recurring_items ri
      JOIN budget_items bi ON ri.budget_item_id = bi.budget_item_id
      JOIN budget_categories bc ON bi.category_id = bc.category_id
      WHERE ri.account_id = ? AND ri.budget_item_id IS NOT NULL
      ORDER BY bc.name, bi.name
    `).all(req.params.id);

    const forecastItems = db.prepare(`
      SELECT fi.*
      FROM forecast_items fi
      WHERE fi.account_id = ? AND fi.is_active = 1
      ORDER BY fi.item_date
    `).all(req.params.id);

    res.json({ account, tags, recurringItems, budgetItems, forecastItems });
  });

  // Only updates fields present in the request body; supports explicit null to clear a field.
  router.patch('/accounts/:id', (req, res) => {
    const ALLOWED = [
      'creditor', 'account_type', 'status',
      'current_balance', 'balance_date', 'interest_rate_pct',
      'original_amount', 'account_number', 'portal_url', 'payoff_date_est',
      'phone', 'email', 'notes',
    ] as const;
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

  router.post('/accounts/:id/tags', (req, res) => {
    const { tag } = req.body as { tag?: string };
    if (!tag?.trim()) return res.status(400).json({ error: 'tag is required' });
    if (!db.prepare('SELECT 1 FROM accounts WHERE account_id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Account not found' });
    }
    db.prepare(
      `INSERT OR IGNORE INTO tags (tag_id, entity_type, entity_id, tag_name) VALUES (?, 'account', ?, ?)`
    ).run(randomUUID(), req.params.id, tag.trim());
    const tags = (db.prepare(
      `SELECT tag_name FROM tags WHERE entity_type = 'account' AND entity_id = ? ORDER BY tag_name`
    ).all(req.params.id) as { tag_name: string }[]).map(r => r.tag_name);
    res.json(tags);
  });

  router.delete('/accounts/:id/tags/:tag', (req, res) => {
    db.prepare(
      `DELETE FROM tags WHERE entity_type = 'account' AND entity_id = ? AND tag_name = ?`
    ).run(req.params.id, decodeURIComponent(req.params.tag));
    const tags = (db.prepare(
      `SELECT tag_name FROM tags WHERE entity_type = 'account' AND entity_id = ? ORDER BY tag_name`
    ).all(req.params.id) as { tag_name: string }[]).map(r => r.tag_name);
    res.json(tags);
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
  // ── Tag helpers ─────────────────────────────────────────────────────────────

  function attachTags<T extends { recurring_item_id: string }>(items: T[]): (T & { tags: string[] })[] {
    if (!items.length) return items.map(i => ({ ...i, tags: [] }));
    const ids = items.map(i => i.recurring_item_id);
    const placeholders = ids.map(() => '?').join(', ');
    const tagRows = db.prepare(
      `SELECT entity_id, tag_name FROM tags WHERE entity_type = 'recurring_item' AND entity_id IN (${placeholders}) ORDER BY tag_name`
    ).all(ids) as { entity_id: string; tag_name: string }[];
    const tagMap: Record<string, string[]> = {};
    for (const { entity_id, tag_name } of tagRows) {
      (tagMap[entity_id] ??= []).push(tag_name);
    }
    return items.map(i => ({ ...i, tags: tagMap[i.recurring_item_id] ?? [] }));
  }

  function recurringWithTags(id: string) {
    const item = db.prepare('SELECT * FROM recurring_items WHERE recurring_item_id = ?').get(id) as { recurring_item_id: string } | undefined;
    if (!item) return undefined;
    return attachTags([item])[0];
  }

  // ── Recurring items ──────────────────────────────────────────────────────────

  // List all distinct tag names used on recurring items (for filter suggestions)
  router.get('/recurring/tags', (_req, res) => {
    const rows = db.prepare(
      `SELECT DISTINCT tag_name FROM tags WHERE entity_type = 'recurring_item' ORDER BY tag_name`
    ).all() as { tag_name: string }[];
    res.json(rows.map(r => r.tag_name));
  });

  router.get('/recurring', (req, res) => {
    const rows = (req.query.all === 'true'
      ? db.prepare('SELECT * FROM recurring_items ORDER BY frequency, name').all()
      : db.prepare('SELECT * FROM active_recurring_items ORDER BY frequency, name').all()) as { recurring_item_id: string }[];
    res.json(attachTags(rows));
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

    res.status(201).json(recurringWithTags(id));
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

    res.json(recurringWithTags(req.params.id));
  });

  router.delete('/recurring/:id', (req, res) => {
    const item = db.prepare('SELECT 1 FROM recurring_items WHERE recurring_item_id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Recurring item not found' });
    db.prepare('DELETE FROM recurring_items WHERE recurring_item_id = ?').run(req.params.id);
    res.status(204).send();
  });

  router.post('/recurring/:id/tags', (req, res) => {
    const { tag } = req.body as { tag?: string };
    if (!tag?.trim()) return res.status(400).json({ error: 'tag is required' });
    const item = db.prepare('SELECT 1 FROM recurring_items WHERE recurring_item_id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Recurring item not found' });
    db.prepare(
      `INSERT OR IGNORE INTO tags (tag_id, entity_type, entity_id, tag_name) VALUES (?, 'recurring_item', ?, ?)`
    ).run(randomUUID(), req.params.id, tag.trim());
    res.json(recurringWithTags(req.params.id));
  });

  router.delete('/recurring/:id/tags/:tag', (req, res) => {
    db.prepare(
      `DELETE FROM tags WHERE entity_type = 'recurring_item' AND entity_id = ? AND tag_name = ?`
    ).run(req.params.id, decodeURIComponent(req.params.tag));
    res.json(recurringWithTags(req.params.id));
  });

  // ── Transactions ────────────────────────────────────────────────────────────

  // Supports: ?account_id= ?start= ?end= ?unmatched=true ?q= ?limit= ?offset=
  router.get('/transactions', (req, res) => {
    const { account_id, start, end, unmatched, q } = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt((req.query.limit as string) || '50'), 5000);
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
          item_type: 'recurring' as const,
          recurring_item_id: item.recurring_item_id,
          forecast_item_id: null,
          name: item.name,
          due_date,
          amount: item.amount,
          frequency: item.frequency,
          account_id: item.account_id ?? null,
          creditor: item.creditor ?? null,
        });
      }
    }

    // Include active forecast items within the window
    const forecasts = db.prepare(`
      SELECT fi.*, a.creditor
      FROM forecast_items fi
      LEFT JOIN accounts a ON fi.account_id = a.account_id
      WHERE fi.is_active = 1 AND fi.item_date >= ? AND fi.item_date <= ?
    `).all(today, end) as any[];

    for (const fi of forecasts) {
      result.push({
        item_type: 'forecast' as const,
        recurring_item_id: null,
        forecast_item_id: fi.forecast_item_id,
        name: fi.name,
        due_date: fi.item_date,
        amount: fi.amount,
        frequency: 'one_time',
        account_id: fi.account_id ?? null,
        creditor: fi.creditor ?? null,
      });
    }

    (result as any[]).sort((a, b) => a.due_date.localeCompare(b.due_date));
    res.json(result);
  });

  // ── Forecast items ───────────────────────────────────────────────────────────

  router.get('/forecast', (req, res) => {
    const activeOnly = req.query.active !== 'false';
    const rows = activeOnly
      ? db.prepare(`
          SELECT fi.*, a.creditor
          FROM forecast_items fi
          LEFT JOIN accounts a ON fi.account_id = a.account_id
          WHERE fi.is_active = 1
          ORDER BY fi.item_date
        `).all()
      : db.prepare(`
          SELECT fi.*, a.creditor
          FROM forecast_items fi
          LEFT JOIN accounts a ON fi.account_id = a.account_id
          ORDER BY fi.item_date
        `).all();
    res.json(rows);
  });

  router.post('/forecast', (req, res) => {
    const { name, amount, item_date, account_id, notes, is_extra_debt_payment } = req.body;
    if (!name || amount == null || !item_date) {
      return res.status(400).json({ error: 'name, amount, and item_date are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item_date)) {
      return res.status(400).json({ error: 'item_date must be YYYY-MM-DD' });
    }
    const id = randomUUID();
    db.prepare(`
      INSERT INTO forecast_items (forecast_item_id, name, amount, item_date, account_id, notes, is_extra_debt_payment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, amount, item_date, account_id ?? null, notes ?? null, is_extra_debt_payment ? 1 : 0);
    res.status(201).json(
      db.prepare('SELECT fi.*, a.creditor FROM forecast_items fi LEFT JOIN accounts a ON fi.account_id = a.account_id WHERE fi.forecast_item_id = ?').get(id)
    );
  });

  router.patch('/forecast/:id', (req, res) => {
    const ALLOWED = ['name', 'amount', 'item_date', 'account_id', 'notes', 'is_active', 'is_extra_debt_payment'] as const;
    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) return res.status(400).json({ error: `Allowed: ${ALLOWED.join(', ')}` });
    const item = db.prepare('SELECT 1 FROM forecast_items WHERE forecast_item_id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Forecast item not found' });
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(
      `UPDATE forecast_items SET ${sets}, updated_at = datetime('now') WHERE forecast_item_id = ?`
    ).run([...entries.map(([, v]) => v), req.params.id]);
    res.json(
      db.prepare('SELECT fi.*, a.creditor FROM forecast_items fi LEFT JOIN accounts a ON fi.account_id = a.account_id WHERE fi.forecast_item_id = ?').get(req.params.id)
    );
  });

  router.delete('/forecast/:id', (req, res) => {
    const item = db.prepare('SELECT 1 FROM forecast_items WHERE forecast_item_id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Forecast item not found' });
    db.prepare('DELETE FROM forecast_items WHERE forecast_item_id = ?').run(req.params.id);
    res.status(204).send();
  });

  // ── Feature requests ─────────────────────────────────────────────────────────

  router.get('/feature-requests', (_req, res) => {
    res.json(db.prepare('SELECT * FROM feature_requests ORDER BY created_at DESC').all());
  });

  router.post('/feature-requests', async (req, res) => {
    const { title, description, submitted_by } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    const id = randomUUID();
    const prefixedTitle = title.trim().startsWith('Finance:') ? title.trim() : `Finance: ${title.trim()}`;
    db.prepare(`
      INSERT INTO feature_requests (request_id, title, description, submitted_by)
      VALUES (?, ?, ?, ?)
    `).run(id, prefixedTitle, description ?? null, submitted_by ?? null);

    // Best-effort: create a matching GitHub issue and link it back.
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      try {
        const repo = process.env.GITHUB_REPO ?? 'nickbenes/bills-tracker';
        const ghBody: Record<string, string> = { title: prefixedTitle };
        if (description?.trim()) ghBody.body = description.trim();
        const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'home-apps-finance',
          },
          body: JSON.stringify(ghBody),
        });
        if (ghRes.ok) {
          const data = await ghRes.json() as { number: number; html_url: string; state: string };
          db.prepare(`
            UPDATE feature_requests
            SET github_issue_number = ?, github_issue_url = ?, github_issue_status = ?,
                updated_at = datetime('now')
            WHERE request_id = ?
          `).run(data.number, data.html_url, data.state, id);
        }
      } catch { /* skip — issue creation is best-effort */ }
    }

    res.status(201).json(db.prepare('SELECT * FROM feature_requests WHERE request_id = ?').get(id));
  });

  router.patch('/feature-requests/:id', (req, res) => {
    const ALLOWED = ['title', 'description', 'submitted_by', 'status', 'github_issue_number'] as const;
    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) return res.status(400).json({ error: `Allowed: ${ALLOWED.join(', ')}` });
    const row = db.prepare('SELECT 1 FROM feature_requests WHERE request_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(
      `UPDATE feature_requests SET ${sets}, updated_at = datetime('now') WHERE request_id = ?`
    ).run([...entries.map(([, v]) => v), req.params.id]);
    res.json(db.prepare('SELECT * FROM feature_requests WHERE request_id = ?').get(req.params.id));
  });

  router.delete('/feature-requests/:id', (req, res) => {
    const row = db.prepare('SELECT 1 FROM feature_requests WHERE request_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    db.prepare('DELETE FROM feature_requests WHERE request_id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Sync GitHub issues ↔ feature_requests:
  //   1. Update github_issue_status for all rows already linked to an issue number.
  //   2. Import any GitHub issues that have no matching row yet (matched by issue number).
  // Requires GITHUB_TOKEN env var; optional GITHUB_REPO (default: nickbenes/bills-tracker).
  router.post('/feature-requests/sync', async (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(501).json({ error: 'GITHUB_TOKEN env var not set — sync unavailable' });
    }
    const repo = process.env.GITHUB_REPO ?? 'nickbenes/bills-tracker';
    const ghHeaders = { Authorization: `Bearer ${token}`, 'User-Agent': 'home-apps-finance' };

    // Step 1: update status on already-linked rows.
    const linked = db.prepare(
      'SELECT request_id, github_issue_number FROM feature_requests WHERE github_issue_number IS NOT NULL'
    ).all() as { request_id: string; github_issue_number: number }[];

    let updated = 0;
    for (const r of linked) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${repo}/issues/${r.github_issue_number}`,
          { headers: ghHeaders }
        );
        if (!ghRes.ok) continue;
        const data = await ghRes.json() as { state: string; html_url: string };
        db.prepare(`
          UPDATE feature_requests
          SET github_issue_status = ?, github_issue_url = ?,
              status = CASE WHEN ? = 'closed' AND status NOT IN ('declined') THEN 'done' ELSE status END,
              updated_at = datetime('now')
          WHERE request_id = ?
        `).run(data.state, data.html_url, data.state, r.request_id);
        updated++;
      } catch { /* skip individual failures */ }
    }

    // Step 2: fetch all GitHub issues (both states) and import any not yet in the DB.
    let imported = 0;
    try {
      const existingNums = new Set(
        (db.prepare('SELECT github_issue_number FROM feature_requests WHERE github_issue_number IS NOT NULL').all() as { github_issue_number: number }[])
          .map(r => r.github_issue_number)
      );

      // Fetch up to 200 issues (2 pages). Pull requests are excluded via the issues API.
      type GhIssue = { number: number; title: string; body: string | null; html_url: string; state: string; pull_request?: unknown };
      const issues: GhIssue[] = [];
      for (const page of [1, 2]) {
        const r = await fetch(
          `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&page=${page}`,
          { headers: ghHeaders }
        );
        if (!r.ok) break;
        const batch = await r.json() as GhIssue[];
        issues.push(...batch.filter(i => !i.pull_request));
        if (batch.length < 100) break;
      }

      for (const issue of issues) {
        if (existingNums.has(issue.number)) continue;
        if (!issue.title.toLowerCase().startsWith('finance:')) continue;
        const newId = randomUUID();
        db.prepare(`
          INSERT INTO feature_requests
            (request_id, title, description, github_issue_number, github_issue_url, github_issue_status, submitted_by,
             status)
          VALUES (?, ?, ?, ?, ?, ?, 'GitHub',
            CASE WHEN ? = 'closed' THEN 'done' ELSE 'open' END)
        `).run(newId, issue.title, issue.body ?? null, issue.number, issue.html_url, issue.state, issue.state);
        imported++;
      }
    } catch { /* skip import failures */ }

    res.json({ synced: linked.length, updated, imported });
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

  // ── Audit log ───────────────────────────────────────────────────────────────

  // ?transaction_id= ?action= ?changed_by= ?limit= ?offset=
  router.get('/audit', (req, res) => {
    const { transaction_id, action, changed_by } = req.query as Record<string, string | undefined>;
    const limit  = Math.min(parseInt((req.query.limit  as string) || '100'), 500);
    const offset = parseInt((req.query.offset as string) || '0');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (transaction_id) { conditions.push('l.transaction_id = ?'); params.push(transaction_id); }
    if (action)         { conditions.push('l.action = ?');         params.push(action); }
    if (changed_by)     { conditions.push('l.changed_by = ?');     params.push(changed_by); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = db.prepare(`
      SELECT
        l.*,
        bi.name              AS budget_item_name,
        bc.name              AS category_name,
        obi.name             AS old_budget_item_name,
        t.merchant_normalized,
        t.merchant_text,
        t.transaction_date,
        t.amount             AS transaction_amount
      FROM classification_audit_log l
      LEFT JOIN budget_items bi    ON l.budget_item_id     = bi.budget_item_id
      LEFT JOIN budget_categories bc ON bi.category_id     = bc.category_id
      LEFT JOIN budget_items obi   ON l.old_budget_item_id = obi.budget_item_id
      LEFT JOIN transactions t     ON l.transaction_id     = t.transaction_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, limit, offset]);

    res.json(rows);
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

    const extraPaymentsAll = db.prepare(`
      SELECT account_id, amount, item_date
      FROM forecast_items
      WHERE is_extra_debt_payment = 1
        AND is_active = 1
        AND account_id IS NOT NULL
        AND amount < 0
        AND item_date >= date('now')
    `).all() as { account_id: string; amount: number; item_date: string }[];

    const extraByAccount = new Map<string, { amount: number; item_date: string }[]>();
    for (const ep of extraPaymentsAll) {
      if (!extraByAccount.has(ep.account_id)) extraByAccount.set(ep.account_id, []);
      extraByAccount.get(ep.account_id)!.push(ep);
    }

    const today = new Date();
    const result = rows.map(r => {
      const extra_payments = extraByAccount.get(r.account_id) ?? [];
      const extra_total = extra_payments.reduce((s, ep) => s + Math.abs(ep.amount), 0);
      const adj_balance = Math.max(0, r.current_balance - extra_total);

      const rate = r.interest_rate_pct != null ? r.interest_rate_pct / 100 / 12 : null;
      const monthly_interest = rate != null ? r.current_balance * rate : null;
      const pmt = r.monthly_payment ?? 0;

      let months_to_payoff: number | null = null;
      if (adj_balance === 0) {
        months_to_payoff = 0;
      } else if (pmt > 0) {
        if (rate == null || rate === 0) {
          months_to_payoff = adj_balance / pmt;
        } else if (pmt > adj_balance * rate) {
          months_to_payoff = -Math.log(1 - rate * adj_balance / pmt) / Math.log(1 + rate);
        }
      }

      let payoff_date: string | null = null;
      if (months_to_payoff != null) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + Math.ceil(months_to_payoff));
        payoff_date = d.toISOString().slice(0, 7); // YYYY-MM
      }

      return { ...r, monthly_interest, months_to_payoff, payoff_date, extra_payments };
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

  // ── Coverage (entity linkage audit) ──────────────────────────────────────────

  router.get('/coverage', (_req, res) => {
    const accounts = db.prepare(`
      SELECT a.account_id, a.creditor, a.account_type, a.status,
             COUNT(ri.recurring_item_id) AS recurring_count
      FROM accounts a
      LEFT JOIN recurring_items ri ON ri.account_id = a.account_id AND ri.is_active = 1
      WHERE a.status NOT IN ('paid_off', 'settled', 'charged_off')
      GROUP BY a.account_id
      ORDER BY a.account_type, a.creditor
    `).all();

    const recurringItems = db.prepare(`
      SELECT ri.recurring_item_id, ri.name, ri.amount, ri.frequency, ri.effective_monthly,
             ri.budget_item_id, bi.name AS budget_item_name, bc.name AS category_name
      FROM recurring_items ri
      LEFT JOIN budget_items bi ON bi.budget_item_id = ri.budget_item_id
      LEFT JOIN budget_categories bc ON bc.category_id = bi.category_id
      WHERE ri.is_active = 1
      ORDER BY ri.name
    `).all();

    const budgetItems = db.prepare(`
      SELECT bi.budget_item_id, bi.name, bc.name AS category_name, bc.display_order,
             COUNT(DISTINCT ri.recurring_item_id) AS recurring_count,
             COUNT(DISTINCT cr.rule_id) AS rule_count
      FROM budget_items bi
      JOIN budget_categories bc ON bc.category_id = bi.category_id
      LEFT JOIN recurring_items ri ON ri.budget_item_id = bi.budget_item_id AND ri.is_active = 1
      LEFT JOIN classification_rules cr ON cr.budget_item_id = bi.budget_item_id AND cr.is_active = 1
      GROUP BY bi.budget_item_id
      ORDER BY bc.display_order, bi.name
    `).all();

    const budgetCategories = db.prepare(`
      SELECT bc.category_id, bc.name,
             COUNT(DISTINCT bi.budget_item_id) AS item_count,
             COUNT(DISTINCT cr.rule_id) AS rule_count
      FROM budget_categories bc
      LEFT JOIN budget_items bi ON bi.category_id = bc.category_id
      LEFT JOIN classification_rules cr ON cr.budget_item_id = bi.budget_item_id AND cr.is_active = 1
      GROUP BY bc.category_id
      ORDER BY bc.display_order
    `).all();

    res.json({ accounts, recurringItems, budgetItems, budgetCategories });
  });

  return router;
}
