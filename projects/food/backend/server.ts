import express from 'express';
import path from 'path';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3003');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/food');

app.use(express.json());
// TODO: mount food API router here
// app.use('/food/api', createRouter());
app.use('/food', express.static(STATIC_DIR));
app.get('/food/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/food/'));

app.listen(PORT, () => {
  console.log(`Food → http://localhost:${PORT}/food/`);
});
