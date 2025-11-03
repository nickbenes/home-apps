const express = require('express');
const router = express.Router();
const storage = require('./storage');

// GET all todos
router.get('/', (req, res) => {
  res.json(storage.getAll());
});

// GET a specific todo by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = storage.getById(id);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(todo);
});

// POST - Create a new todo
router.post('/', (req, res) => {
  const { title, completed } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newTodo = storage.create(title, completed);
  res.status(201).json(newTodo);
});

// PUT - Update a todo
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, completed } = req.body;

  const updatedTodo = storage.update(id, { title, completed });

  if (!updatedTodo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(updatedTodo);
});

// DELETE a todo
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deletedTodo = storage.delete(id);

  if (!deletedTodo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(deletedTodo);
});

module.exports = router;
