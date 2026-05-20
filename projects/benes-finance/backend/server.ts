import express from 'express';
import path from 'path';
import { getDb } from './db.js';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/benes-finance');

app.use(express.json());
app.use('/api', createRouter(getDb()));
app.use(express.static(STATIC_DIR));
// SPA fallback: serve index.html for any non-API route
app.get('*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`Benes Finance → http://localhost:${PORT}`);
});
