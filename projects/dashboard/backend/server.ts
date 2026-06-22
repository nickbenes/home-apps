import express from 'express';
import path from 'path';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3004');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/dashboard');

app.use(express.json());
app.use('/dashboard/api', createRouter());
app.use('/dashboard', express.static(STATIC_DIR));
app.get('/dashboard/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/dashboard/'));

app.listen(PORT, () => {
  console.log(`Dashboard → http://localhost:${PORT}/dashboard/`);
});
