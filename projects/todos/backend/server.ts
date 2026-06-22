import express from 'express';
import path from 'path';
import { getDb } from './db.js';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/todos');

app.use(express.json());
app.use('/todos/api/todos', createRouter(getDb()));
app.use('/todos', express.static(STATIC_DIR));
app.get('/todos/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/todos/'));

app.listen(PORT, () => {
  console.log(`Todos → http://localhost:${PORT}/todos/`);
});
