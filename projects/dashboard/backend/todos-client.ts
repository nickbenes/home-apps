const TODOS_API = process.env.TODOS_API_URL ?? 'http://localhost:3000/todos/api/todos';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export async function getOpenTodos(): Promise<Todo[]> {
  try {
    const res = await fetch(TODOS_API);
    if (!res.ok) return [];
    const todos: Todo[] = await res.json();
    return todos.filter(t => !t.completed);
  } catch {
    return [];
  }
}
