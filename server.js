const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const todosRouter = require('./backend/todos/routes');

// Root endpoint
app.get('/', (req, res) => {
  res.send('Express Server - Available apps: /todos/');
});

// Serve React Todo app at /todos/
app.get('/todos/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Mount todos API routes
app.use('/api/todos', todosRouter);

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
