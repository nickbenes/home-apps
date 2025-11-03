// In-memory storage for bills
let bills = [];
let nextId = 1;

module.exports = {
  getAll: () => bills,

  getById: (id) => bills.find(b => b.id === id),

  create: (name, amount, dueDate, paid = false) => {
    const newBill = {
      id: nextId++,
      name,
      amount,
      dueDate,
      paid
    };
    bills.push(newBill);
    return newBill;
  },

  update: (id, updates) => {
    const index = bills.findIndex(b => b.id === id);
    if (index === -1) return null;

    if (updates.name !== undefined) {
      bills[index].name = updates.name;
    }
    if (updates.amount !== undefined) {
      bills[index].amount = updates.amount;
    }
    if (updates.dueDate !== undefined) {
      bills[index].dueDate = updates.dueDate;
    }
    if (updates.paid !== undefined) {
      bills[index].paid = updates.paid;
    }

    return bills[index];
  },

  delete: (id) => {
    const index = bills.findIndex(b => b.id === id);
    if (index === -1) return null;

    const deleted = bills.splice(index, 1)[0];
    return deleted;
  }
};
