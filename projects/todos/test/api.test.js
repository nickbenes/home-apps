const request = require('supertest');
const app = require('../backend/server');

describe('Todos API', () => {
  describe('GET /todos/api/todos', () => {
    it('should return empty array initially', async () => {
      const res = await request(app).get('/todos/api/todos');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /todos/api/todos', () => {
    it('should create a new todo', async () => {
      const res = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Test todo', completed: false })
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test todo');
      expect(res.body.completed).toBe(false);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/todos/api/todos')
        .send({})
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should default completed to false if not provided', async () => {
      const res = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Test todo without completed field' })
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(201);
      expect(res.body.completed).toBe(false);
    });
  });

  describe('GET /todos/api/todos/:id', () => {
    it('should get a specific todo by id', async () => {
      const createRes = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Specific todo' })
        .set('Content-Type', 'application/json');
      const todoId = createRes.body.id;

      const res = await request(app).get(`/todos/api/todos/${todoId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(todoId);
      expect(res.body.title).toBe('Specific todo');
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app).get('/todos/api/todos/9999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /todos/api/todos/:id', () => {
    it('should update a todo', async () => {
      const createRes = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Todo to update' })
        .set('Content-Type', 'application/json');
      const todoId = createRes.body.id;

      const res = await request(app)
        .put(`/todos/api/todos/${todoId}`)
        .send({ title: 'Updated title', completed: true })
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(res.body.completed).toBe(true);
    });

    it('should update only the title', async () => {
      const createRes = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Original title', completed: false })
        .set('Content-Type', 'application/json');
      const todoId = createRes.body.id;

      const res = await request(app)
        .put(`/todos/api/todos/${todoId}`)
        .send({ title: 'New title' })
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New title');
      expect(res.body.completed).toBe(false);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app)
        .put('/todos/api/todos/9999')
        .send({ title: 'Update' })
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /todos/api/todos/:id', () => {
    it('should delete a todo', async () => {
      const createRes = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Todo to delete' })
        .set('Content-Type', 'application/json');
      const todoId = createRes.body.id;

      const res = await request(app).delete(`/todos/api/todos/${todoId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(todoId);

      const getRes = await request(app).get(`/todos/api/todos/${todoId}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app).delete('/todos/api/todos/9999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Integration - Full CRUD flow', () => {
    it('should handle complete todo lifecycle', async () => {
      const createRes = await request(app)
        .post('/todos/api/todos')
        .send({ title: 'Integration test todo' })
        .set('Content-Type', 'application/json');
      expect(createRes.statusCode).toBe(201);
      const todoId = createRes.body.id;

      const getAllRes = await request(app).get('/todos/api/todos');
      expect(getAllRes.statusCode).toBe(200);
      expect(getAllRes.body.some(t => t.id === todoId)).toBe(true);

      const getOneRes = await request(app).get(`/todos/api/todos/${todoId}`);
      expect(getOneRes.statusCode).toBe(200);

      const updateRes = await request(app)
        .put(`/todos/api/todos/${todoId}`)
        .send({ completed: true })
        .set('Content-Type', 'application/json');
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.completed).toBe(true);

      const deleteRes = await request(app).delete(`/todos/api/todos/${todoId}`);
      expect(deleteRes.statusCode).toBe(200);

      const verifyRes = await request(app).get(`/todos/api/todos/${todoId}`);
      expect(verifyRes.statusCode).toBe(404);
    });
  });
});
