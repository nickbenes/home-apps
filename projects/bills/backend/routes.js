const express = require('express');
const router = express.Router();
const storage = require('./storage');

// GET all bills
router.get('/', (req, res) => {
  res.json(storage.getAll());
});

// GET a specific bill by id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const bill = storage.getById(id);

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  res.json(bill);
});

// POST - Create a new bill
router.post('/', (req, res) => {
  const { name, amount, dueDate, paid } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  const newBill = storage.create(name, amount, dueDate, paid);
  res.status(201).json(newBill);
});

// PUT - Update a bill
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, amount, dueDate, paid } = req.body;

  const updatedBill = storage.update(id, { name, amount, dueDate, paid });

  if (!updatedBill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  res.json(updatedBill);
});

// DELETE a bill
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deletedBill = storage.delete(id);

  if (!deletedBill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  res.json(deletedBill);
});

module.exports = router;
