const request = require('supertest');
const app = require('../../../server');

describe('Todos API', () => {
  describe('GET /api/todos', () => {
    it('should return empty array initially', async () => {
      const res = await request(app).get('/api/todos');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = {
        title: 'Test todo',
        completed: false
      };

      const res = await request(app)
        .post('/api/todos')
        .send(newTodo)
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(newTodo.title);
      expect(res.body.completed).toBe(false);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({})
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should default completed to false if not provided', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({ title: 'Test todo without completed field' })
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(201);
      expect(res.body.completed).toBe(false);
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should get a specific todo by id', async () => {
      // Create a todo first
      const createRes = await request(app)
        .post('/api/todos')
        .send({ title: 'Specific todo' })
        .set('Content-Type', 'application/json');

      const todoId = createRes.body.id;

      // Get the todo
      const res = await request(app).get(`/api/todos/${todoId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(todoId);
      expect(res.body.title).toBe('Specific todo');
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app).get('/api/todos/9999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update a todo', async () => {
      // Create a todo first
      const createRes = await request(app)
        .post('/api/todos')
        .send({ title: 'Todo to update' })
        .set('Content-Type', 'application/json');

      const todoId = createRes.body.id;

      // Update the todo
      const res = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ title: 'Updated title', completed: true })
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(res.body.completed).toBe(true);
    });

    it('should update only the title', async () => {
      // Create a todo first
      const createRes = await request(app)
        .post('/api/todos')
        .send({ title: 'Original title', completed: false })
        .set('Content-Type', 'application/json');

      const todoId = createRes.body.id;

      // Update only the title
      const res = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ title: 'New title' })
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New title');
      expect(res.body.completed).toBe(false);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app)
        .put('/api/todos/9999')
        .send({ title: 'Update' })
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      // Create a todo first
      const createRes = await request(app)
        .post('/api/todos')
        .send({ title: 'Todo to delete' })
        .set('Content-Type', 'application/json');

      const todoId = createRes.body.id;

      // Delete the todo
      const res = await request(app).delete(`/api/todos/${todoId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(todoId);

      // Verify it's deleted
      const getRes = await request(app).get(`/api/todos/${todoId}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(app).delete('/api/todos/9999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Integration - Full CRUD flow', () => {
    it('should handle complete todo lifecycle', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/todos')
        .send({ title: 'Integration test todo' })
        .set('Content-Type', 'application/json');

      expect(createRes.statusCode).toBe(201);
      const todoId = createRes.body.id;

      // Read all
      const getAllRes = await request(app).get('/api/todos');
      expect(getAllRes.statusCode).toBe(200);
      expect(getAllRes.body.some(t => t.id === todoId)).toBe(true);

      // Read one
      const getOneRes = await request(app).get(`/api/todos/${todoId}`);
      expect(getOneRes.statusCode).toBe(200);

      // Update
      const updateRes = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ completed: true })
        .set('Content-Type', 'application/json');

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.completed).toBe(true);

      // Delete
      const deleteRes = await request(app).delete(`/api/todos/${todoId}`);
      expect(deleteRes.statusCode).toBe(200);

      // Verify deleted
      const verifyRes = await request(app).get(`/api/todos/${todoId}`);
      expect(verifyRes.statusCode).toBe(404);
    });
  });
});
