import express from 'express';
import path from 'path';
import { getDb } from './db.js';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/finance');

app.use(express.json());
app.use('/finance/api', createRouter(getDb()));
app.use('/finance', express.static(STATIC_DIR));
app.get('/finance/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/finance/'));

app.listen(PORT, () => {
  console.log(`Finance → http://localhost:${PORT}/finance/`);
});
