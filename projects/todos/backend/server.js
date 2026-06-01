const express = require('express');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000');
const STATIC_DIR = path.join(__dirname, '../../../public/todos');

app.use(express.json());
app.use('/todos/api/todos', require('./routes'));
app.use('/todos', express.static(STATIC_DIR));
app.get('/todos/*', (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
app.get('/', (_req, res) => res.redirect('/todos/'));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Todos → http://localhost:${PORT}/todos/`);
  });
}

module.exports = app;
