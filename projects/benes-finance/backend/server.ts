import express from 'express';
import { getDb } from './db.js';
import { createRouter } from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001');

app.use(express.json());
app.use('/api', createRouter(getDb()));

app.listen(PORT, () => {
  console.log(`Benes Finance API — http://localhost:${PORT}/api`);
});
