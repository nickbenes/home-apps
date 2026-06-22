import type BetterSqlite3 from 'better-sqlite3';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

interface TodoRow {
  id: number;
  title: string;
  completed: number;
}

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, completed: !!row.completed };
}

export function createStorage(db: BetterSqlite3.Database) {
  return {
    getAll(): Todo[] {
      const rows = db.prepare('SELECT id, title, completed FROM todos').all() as TodoRow[];
      return rows.map(toTodo);
    },

    getById(id: number): Todo | undefined {
      const row = db.prepare('SELECT id, title, completed FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
      return row ? toTodo(row) : undefined;
    },

    create(title: string, completed = false): Todo {
      const result = db.prepare('INSERT INTO todos (title, completed) VALUES (?, ?)').run(title, completed ? 1 : 0);
      return { id: Number(result.lastInsertRowid), title, completed };
    },

    update(id: number, updates: { title?: string; completed?: boolean }): Todo | null {
      const existing = db.prepare('SELECT id, title, completed FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
      if (!existing) return null;

      const title = updates.title !== undefined ? updates.title : existing.title;
      const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : existing.completed;

      db.prepare('UPDATE todos SET title = ?, completed = ? WHERE id = ?').run(title, completed, id);
      return { id, title, completed: !!completed };
    },

    delete(id: number): Todo | null {
      const existing = db.prepare('SELECT id, title, completed FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
      if (!existing) return null;

      db.prepare('DELETE FROM todos WHERE id = ?').run(id);
      return toTodo(existing);
    },
  };
}
