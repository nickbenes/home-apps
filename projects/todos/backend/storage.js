// In-memory storage for todos
let todos = [];
let nextId = 1;

module.exports = {
  getAll: () => todos,

  getById: (id) => todos.find(t => t.id === id),

  create: (title, completed = false) => {
    const newTodo = {
      id: nextId++,
      title,
      completed
    };
    todos.push(newTodo);
    return newTodo;
  },

  update: (id, updates) => {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    if (updates.title !== undefined) {
      todos[index].title = updates.title;
    }
    if (updates.completed !== undefined) {
      todos[index].completed = updates.completed;
    }

    return todos[index];
  },

  delete: (id) => {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const deleted = todos.splice(index, 1)[0];
    return deleted;
  }
};
