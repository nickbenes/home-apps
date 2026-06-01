import express from 'express';
import path from 'path';
import { getDb } from './db.js';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3003');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/food');

app.use(express.json());
app.use('/food/api', createRouter(getDb()));
app.use('/food', express.static(STATIC_DIR));
app.get('/food/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/food/'));

app.listen(PORT, () => {
  console.log(`Food → http://localhost:${PORT}/food/`);
});
