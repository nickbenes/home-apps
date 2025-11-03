const request = require('supertest');
const app = require('./server');

describe('Express Server', () => {
  describe('GET /', () => {
    it('should return server info', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Express Server');
      expect(res.text).toContain('/todos/');
    });
  });

  describe('GET /todos/', () => {
    it('should serve the todos app HTML', async () => {
      const res = await request(app).get('/todos/');
      expect(res.statusCode).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('Todo App');
      expect(res.text).toContain('<div id="root">');
    });
  });

  describe('GET /bills/', () => {
    it('should serve the bills app HTML', async () => {
      const res = await request(app).get('/bills/');
      expect(res.statusCode).toBe(200);
      expect(res.type).toBe('text/html');
      // index.html includes a <title> Bills App and a root div
      expect(res.text).toContain('Bills App');
      expect(res.text).toContain('<div id="root">');
    });
  });

  describe('Static files', () => {
    it('should serve static files from public directory', async () => {
      const res = await request(app).get('/todos/index.html');
      expect(res.statusCode).toBe(200);
      expect(res.type).toBe('text/html');
    });
  });
});
