import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTestDb, seedFixtures } from './helpers/testDb';
import { createRouter } from '../backend/routes';

function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api', createRouter(db));
  return app;
}

describe('Benes Finance API', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    seedFixtures(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── Accounts ────────────────────────────────────────────────────────────────

  describe('GET /api/accounts', () => {
    test('returns all accounts', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      const ids = res.body.map((a: any) => a.account_id);
      expect(ids).toContain('test_checking');
      expect(ids).toContain('test_loan');
    });
  });

  describe('GET /api/accounts/:id', () => {
    test('returns the account', async () => {
      const res = await request(app).get('/api/accounts/test_loan');
      expect(res.statusCode).toBe(200);
      expect(res.body.creditor).toBe('Sample Lender LLC');
      expect(res.body.current_balance).toBe(5000);
    });

    test('404 for unknown id', async () => {
      const res = await request(app).get('/api/accounts/no_such_account');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    test('updates current_balance', async () => {
      const res = await request(app)
        .patch('/api/accounts/test_loan')
        .send({ current_balance: 4800 });
      expect(res.statusCode).toBe(200);
      expect(res.body.current_balance).toBe(4800);
    });

    test('updates multiple fields at once', async () => {
      const res = await request(app)
        .patch('/api/accounts/test_loan')
        .send({ current_balance: 4600, balance_date: '2026-06-01', notes: 'paid June' });
      expect(res.statusCode).toBe(200);
      expect(res.body.current_balance).toBe(4600);
      expect(res.body.balance_date).toBe('2026-06-01');
      expect(res.body.notes).toBe('paid June');
    });

    test('400 when body has no valid fields', async () => {
      const res = await request(app)
        .patch('/api/accounts/test_loan')
        .send({ creditor: 'Hacked', account_type: 'mortgage' });
      expect(res.statusCode).toBe(400);
    });

    test('404 for unknown account', async () => {
      const res = await request(app)
        .patch('/api/accounts/no_such')
        .send({ current_balance: 100 });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Budget ──────────────────────────────────────────────────────────────────

  describe('GET /api/budget/categories', () => {
    test('returns categories in display_order', async () => {
      const res = await request(app).get('/api/budget/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].category_id).toBe('food');
      expect(res.body[1].category_id).toBe('debts');
    });
  });

  describe('GET /api/budget/items', () => {
    test('returns items with category_name joined', async () => {
      const res = await request(app).get('/api/budget/items');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      const groceries = res.body.find((i: any) => i.budget_item_id === 'groceries');
      expect(groceries).toBeDefined();
      expect(groceries.category_name).toBe('Food');
    });
  });

  // ── Cashflow ────────────────────────────────────────────────────────────────

  describe('GET /api/recurring', () => {
    test('returns active recurring items', async () => {
      const res = await request(app).get('/api/recurring');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].recurring_item_id).toBe('loan_cf');
    });

    test('?all=true returns all items (same result when none are inactive)', async () => {
      const res = await request(app).get('/api/recurring?all=true');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('inactive items are excluded by default', async () => {
      db.prepare(`UPDATE recurring_items SET is_active = 0 WHERE recurring_item_id = 'loan_cf'`).run();
      const active = await request(app).get('/api/recurring');
      expect(active.body).toHaveLength(0);
      const all = await request(app).get('/api/recurring?all=true');
      expect(all.body).toHaveLength(1);
    });
  });

  // ── Transactions ────────────────────────────────────────────────────────────

  describe('GET /api/transactions', () => {
    test('returns all transactions newest-first', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].transaction_id).toBe('tx_003'); // 2026-05-10
    });

    test('?account_id= filters by account', async () => {
      const res = await request(app).get('/api/transactions?account_id=test_checking');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(3);

      const res2 = await request(app).get('/api/transactions?account_id=test_loan');
      expect(res2.body).toHaveLength(0);
    });

    test('?q= searches merchant text', async () => {
      const res = await request(app).get('/api/transactions?q=GROCERY');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].transaction_id).toBe('tx_001');
    });

    test('?q= matches normalized name too', async () => {
      const res = await request(app).get('/api/transactions?q=Grocery');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('?unmatched=true returns only unclassified transactions', async () => {
      const res = await request(app).get('/api/transactions?unmatched=true');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    test('?limit= caps results', async () => {
      const res = await request(app).get('/api/transactions?limit=2');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('?offset= paginates', async () => {
      const res = await request(app).get('/api/transactions?limit=2&offset=2');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('each row includes mapping_count', async () => {
      const res = await request(app).get('/api/transactions');
      for (const tx of res.body) {
        expect(tx).toHaveProperty('mapping_count');
      }
    });
  });

  describe('GET /api/transactions/:id', () => {
    test('returns transaction with empty mappings array', async () => {
      const res = await request(app).get('/api/transactions/tx_001');
      expect(res.statusCode).toBe(200);
      expect(res.body.transaction_id).toBe('tx_001');
      expect(res.body.amount).toBe(-45);
      expect(res.body.mappings).toEqual([]);
    });

    test('404 for unknown transaction', async () => {
      const res = await request(app).get('/api/transactions/no_such_tx');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Classifications ─────────────────────────────────────────────────────────

  describe('POST /api/transactions/:id/classify', () => {
    test('creates a mapping and returns 201', async () => {
      const res = await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });
      expect(res.statusCode).toBe(201);
      expect(res.body.budget_item_id).toBe('groceries');
      expect(res.body.allocated_amount).toBe(-45);
      expect(res.body.confidence).toBe('manual');
    });

    test('mapping appears on subsequent GET /transactions/:id', async () => {
      await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });

      const res = await request(app).get('/api/transactions/tx_001');
      expect(res.body.mappings).toHaveLength(1);
      expect(res.body.mappings[0].budget_item_name).toBe('Groceries');
      expect(res.body.mappings[0].category_name).toBe('Food');
    });

    test('classified transaction is excluded from ?unmatched=true', async () => {
      await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });

      const res = await request(app).get('/api/transactions?unmatched=true');
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t: any) => t.transaction_id)).not.toContain('tx_001');
    });

    test('400 when required fields missing', async () => {
      const res1 = await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries' }); // missing allocated_amount
      expect(res1.statusCode).toBe(400);

      const res2 = await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ allocated_amount: -45 }); // missing budget_item_id
      expect(res2.statusCode).toBe(400);
    });

    test('404 for unknown transaction', async () => {
      const res = await request(app)
        .post('/api/transactions/no_such_tx/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });
      expect(res.statusCode).toBe(404);
    });

    test('writes an audit log entry', async () => {
      await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });

      const log = db.prepare(
        `SELECT * FROM classification_audit_log WHERE transaction_id = 'tx_001'`
      ).all() as any[];
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('created');
      expect(log[0].new_allocated_amount).toBe(-45);
    });
  });

  describe('DELETE /api/mappings/:id', () => {
    let mappingId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/transactions/tx_002/classify')
        .send({ budget_item_id: 'loan_payment', allocated_amount: -200 });
      mappingId = res.body.mapping_id;
    });

    test('deletes the mapping and returns 204', async () => {
      const res = await request(app).delete(`/api/mappings/${mappingId}`);
      expect(res.statusCode).toBe(204);
    });

    test('transaction returns to unmatched after delete', async () => {
      await request(app).delete(`/api/mappings/${mappingId}`);
      const res = await request(app).get('/api/transactions?unmatched=true');
      expect(res.body.map((t: any) => t.transaction_id)).toContain('tx_002');
    });

    test('writes a deleted audit log entry', async () => {
      await request(app).delete(`/api/mappings/${mappingId}`);
      const log = db.prepare(
        `SELECT * FROM classification_audit_log WHERE transaction_id = 'tx_002' AND action = 'deleted'`
      ).all() as any[];
      expect(log).toHaveLength(1);
      expect(log[0].old_allocated_amount).toBe(-200);
    });

    test('404 for unknown mapping', async () => {
      const res = await request(app).delete('/api/mappings/no-such-mapping-id');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Scheduled payments ──────────────────────────────────────────────────────

  describe('GET /api/scheduled', () => {
    function dateFromToday(offsetDays: number): string {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function insertCashflow(db: Database.Database, overrides: Record<string, unknown> = {}) {
      const defaults = {
        recurring_item_id: 'test_cf',   // overridden in each test
        budget_item_id: 'loan_payment',
        account_id: 'test_loan',
        name: 'Test Bill',
        amount: -100,
        frequency: 'monthly',
        payments_per_year: 12,
        effective_monthly: -100,
        projected_start_date: dateFromToday(0),
        projected_stop_date: null,
        is_active: 1,
      };
      const row = { ...defaults, ...overrides };
      db.prepare(`
        INSERT INTO recurring_items
          (recurring_item_id, budget_item_id, account_id, name, amount, frequency,
           payments_per_year, effective_monthly, projected_start_date, projected_stop_date, is_active)
        VALUES
          (@recurring_item_id, @budget_item_id, @account_id, @name, @amount, @frequency,
           @payments_per_year, @effective_monthly, @projected_start_date, @projected_stop_date, @is_active)
      `).run(row);
    }

    test('returns an array', async () => {
      const res = await request(app).get('/api/scheduled');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('includes item starting today', async () => {
      insertCashflow(db, { recurring_item_id: 'cf_today', projected_start_date: dateFromToday(0) });
      const res = await request(app).get('/api/scheduled?days=90');
      const ids = res.body.map((p: any) => p.recurring_item_id);
      expect(ids).toContain('cf_today');
    });

    test('excludes item starting after the window', async () => {
      insertCashflow(db, { recurring_item_id: 'cf_far', projected_start_date: dateFromToday(91) });
      const res = await request(app).get('/api/scheduled?days=90');
      const ids = res.body.map((p: any) => p.recurring_item_id);
      expect(ids).not.toContain('cf_far');
    });

    test('monthly item appears multiple times within 90-day window', async () => {
      insertCashflow(db, { recurring_item_id: 'cf_monthly', projected_start_date: dateFromToday(0) });
      const res = await request(app).get('/api/scheduled?days=90');
      const occurrences = res.body.filter((p: any) => p.recurring_item_id === 'cf_monthly');
      expect(occurrences.length).toBeGreaterThanOrEqual(2);
    });

    test('one_time item appears exactly once', async () => {
      insertCashflow(db, {
        recurring_item_id: 'cf_once',
        frequency: 'one_time',
        payments_per_year: 1,
        effective_monthly: -8.33,
        projected_start_date: dateFromToday(5),
      });
      const res = await request(app).get('/api/scheduled?days=30');
      const occurrences = res.body.filter((p: any) => p.recurring_item_id === 'cf_once');
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].due_date).toBe(dateFromToday(5));
    });

    test('respects projected_stop_date', async () => {
      // starts today, stops in 10 days — should not appear at +30d
      insertCashflow(db, {
        recurring_item_id: 'cf_stops',
        frequency: 'weekly',
        payments_per_year: 52,
        effective_monthly: -433,
        projected_start_date: dateFromToday(0),
        projected_stop_date: dateFromToday(10),
      });
      const res = await request(app).get('/api/scheduled?days=90');
      const occurrences = res.body.filter((p: any) => p.recurring_item_id === 'cf_stops');
      expect(occurrences.every((p: any) => p.due_date <= dateFromToday(10))).toBe(true);
    });

    test('inactive items are excluded', async () => {
      insertCashflow(db, { recurring_item_id: 'cf_inactive', is_active: 0 });
      const res = await request(app).get('/api/scheduled?days=90');
      const ids = res.body.map((p: any) => p.recurring_item_id);
      expect(ids).not.toContain('cf_inactive');
    });

    test('each item includes name, amount, frequency, due_date', async () => {
      insertCashflow(db, {
        recurring_item_id: 'cf_shape',
        name: 'Shape Test Bill',
        amount: -150,
        frequency: 'monthly',
        projected_start_date: dateFromToday(1),
      });
      const res = await request(app).get('/api/scheduled?days=60');
      const item = res.body.find((p: any) => p.recurring_item_id === 'cf_shape');
      expect(item).toBeDefined();
      expect(item.name).toBe('Shape Test Bill');
      expect(item.amount).toBe(-150);
      expect(item.frequency).toBe('monthly');
      expect(typeof item.due_date).toBe('string');
    });

    test('results are sorted by due_date ascending', async () => {
      const res = await request(app).get('/api/scheduled?days=90');
      const dates: string[] = res.body.map((p: any) => p.due_date);
      expect(dates).toEqual([...dates].sort());
    });

    test('creditor is joined from accounts table', async () => {
      insertCashflow(db, { recurring_item_id: 'cf_creditor', projected_start_date: dateFromToday(0) });
      const res = await request(app).get('/api/scheduled?days=30');
      const item = res.body.find((p: any) => p.recurring_item_id === 'cf_creditor');
      expect(item.creditor).toBe('Sample Lender LLC');
    });
  });

  // ── Summary ─────────────────────────────────────────────────────────────────

  describe('GET /api/summary', () => {
    test('returns total_debt, monthly recurring totals, and unmatched count', async () => {
      const res = await request(app).get('/api/summary');
      expect(res.statusCode).toBe(200);
      expect(res.body.total_debt).toBe(5000);
      expect(res.body.unmatched_transaction_count).toBe(3);
      expect(Array.isArray(res.body.monthly_recurring_by_category)).toBe(true);
    });

    test('total_debt excludes income_source accounts', async () => {
      // test_checking is income_source — should not count toward debt
      const res = await request(app).get('/api/summary');
      expect(res.body.total_debt).toBe(5000); // only test_loan counts
    });

    test('unmatched count decreases after classification', async () => {
      await request(app)
        .post('/api/transactions/tx_001/classify')
        .send({ budget_item_id: 'groceries', allocated_amount: -45 });

      const res = await request(app).get('/api/summary');
      expect(res.body.unmatched_transaction_count).toBe(2);
    });
  });
});
