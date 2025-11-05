const request = require('supertest');
const express = require('express');

// Attach the bills router to a fresh express app for isolated testing
const billsRouter = require('../../../projects/bills/backend/routes');
const storage = require('../../../projects/bills/backend/storage');

function createApp() {
  const app = express();
  app.use(express.json());
  // mount the router at / to exercise the same handlers as mounted in server
  app.use('/api/bills', billsRouter);
  return app;
}

describe('Bills API', () => {
  let app;

  beforeEach(() => {
    // ensure clean in-memory storage between tests
    const existing = storage.getAll().slice();
    for (const b of existing) {
      storage.delete(b.id);
    }
    app = createApp();
  });

  test('GET /api/bills returns empty array initially', async () => {
    const res = await request(app).get('/api/bills');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/bills creates a bill and validates inputs', async () => {
    // missing name -> 400
    let res = await request(app).post('/api/bills').send({ amount: 12.34 });
    expect(res.statusCode).toBe(400);

    // invalid amount -> 400
    res = await request(app).post('/api/bills').send({ name: 'Rent', amount: 'not-a-number' });
    expect(res.statusCode).toBe(400);

    // valid create
    const newBill = { name: 'Rent', amount: 1200.0, dueDate: '2025-12-01', paid: false };
    res = await request(app).post('/api/bills').send(newBill);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(newBill.name);
    expect(res.body.amount).toBe(newBill.amount);
  });

  test('GET /api/bills/:id returns 404 for missing id and returns created bill', async () => {
    let res = await request(app).get('/api/bills/9999');
    expect(res.statusCode).toBe(404);

    // create then fetch
    const createRes = await request(app).post('/api/bills').send({ name: 'Electric', amount: 60 });
    const id = createRes.body.id;

    res = await request(app).get(`/api/bills/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Electric');
  });

  test('PUT /api/bills/:id updates fields and returns 404 for missing', async () => {
    // missing returns 404
    let res = await request(app).put('/api/bills/9999').send({ name: 'X' });
    expect(res.statusCode).toBe(404);

    // create
    const createRes = await request(app).post('/api/bills').send({ name: 'Water', amount: 30 });
    const id = createRes.body.id;

    // update
    res = await request(app).put(`/api/bills/${id}`).send({ name: 'Water (updated)', paid: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Water (updated)');
    expect(res.body.paid).toBe(true);
  });

  test('DELETE /api/bills/:id deletes and returns 404 for missing', async () => {
    // create
    const createRes = await request(app).post('/api/bills').send({ name: 'Trash', amount: 5 });
    const id = createRes.body.id;

    // delete
    const delRes = await request(app).delete(`/api/bills/${id}`);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.id).toBe(id);

    // verify gone
    const getRes = await request(app).get(`/api/bills/${id}`);
    expect(getRes.statusCode).toBe(404);
  });
});
