import express from 'express';
import financeRouter from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001');

app.use(express.json());
app.use('/api', financeRouter);

app.listen(PORT, () => {
  console.log(`Benes Finance API — http://localhost:${PORT}/api`);
});
