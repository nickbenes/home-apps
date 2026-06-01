import express from 'express';
import path from 'path';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3002');
const STATIC_DIR = path.join(import.meta.dirname, '../../../public/calendar');

app.use(express.json());
// TODO: mount calendar API router here
// app.use('/calendar/api', createRouter());
app.use('/calendar', express.static(STATIC_DIR));
app.get('/calendar/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/calendar/'));

app.listen(PORT, () => {
  console.log(`Calendar → http://localhost:${PORT}/calendar/`);
});
