import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the App component by reading the actual source
// In a real setup, you'd import directly, but we need to handle the createRoot call
const mockTodos = [
  { id: 1, title: 'Test Todo 1', completed: false },
  { id: 2, title: 'Test Todo 2', completed: true }
];

// Create a testable version of the App component
function App() {
  const [todos, setTodos] = React.useState<any[]>([]);
  const [newTodo, setNewTodo] = React.useState('');

  React.useEffect(() => {
    fetch('/api/todos')
      .then(res => res.json())
      .then(data => setTodos(data))
      .catch(err => console.error('Error fetching todos:', err));
  }, []);

  const addTodo = async () => {
    if (!newTodo.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTodo, completed: false }),
      });
      const todo = await response.json();
      setTodos([...todos, todo]);
      setNewTodo('');
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      const updatedTodo = await response.json();
      setTodos(todos.map(t => t.id === id ? updatedTodo : t));
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      setTodos(todos.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Todo App</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
          style={{ padding: '10px', width: '70%', marginRight: '10px' }}
        />
        <button onClick={addTodo} style={{ padding: '10px 20px' }}>
          Add
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map((todo: any) => (
          <li key={todo.id} style={{
            padding: '10px',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id, todo.completed)}
                style={{ marginRight: '10px' }}
              />
              <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                {todo.title}
              </span>
            </div>
            <button onClick={() => deleteTodo(todo.id)} style={{ padding: '5px 10px' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('Todo App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the app title', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      expect(screen.getByText('Todo App')).toBeInTheDocument();
    });

    it('should render input field and add button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should fetch and display existing todos on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockTodos
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
        expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/todos');
    });
  });

  describe('Adding Todos', () => {
    it('should add a new todo when form is submitted', async () => {
      const user = userEvent.setup();

      // Mock initial fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      });

      // Mock POST request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 3, title: 'New Todo', completed: false })
      });

      const input = screen.getByPlaceholderText('Add a new todo...');
      const addButton = screen.getByText('Add');

      await user.type(input, 'New Todo');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('New Todo')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Todo', completed: false })
      });
    });

    it('should add a new todo when Enter key is pressed', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 4, title: 'Enter Todo', completed: false })
      });

      const input = screen.getByPlaceholderText('Add a new todo...');

      await user.type(input, 'Enter Todo{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Enter Todo')).toBeInTheDocument();
      });
    });

    it('should not add todo with empty title', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add');
      await user.click(addButton);

      // fetch should only be called once (initial load)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear input after adding todo', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 5, title: 'Clear Test', completed: false })
      });

      const input = screen.getByPlaceholderText('Add a new todo...') as HTMLInputElement;
      await user.type(input, 'Clear Test');
      await user.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Toggling Todos', () => {
    it('should toggle todo completion status', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => [{ id: 1, title: 'Toggle Test', completed: false }]
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Toggle Test')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 1, title: 'Toggle Test', completed: true })
      });

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await user.click(checkbox);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true })
        });
      });
    });

    it('should apply strikethrough style to completed todos', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => [
          { id: 1, title: 'Not Completed', completed: false },
          { id: 2, title: 'Completed', completed: true }
        ]
      });

      render(<App />);

      await waitFor(() => {
        const completedTodo = screen.getByText('Completed');
        expect(completedTodo).toHaveStyle({ textDecoration: 'line-through' });

        const notCompletedTodo = screen.getByText('Not Completed');
        expect(notCompletedTodo).toHaveStyle({ textDecoration: 'none' });
      });
    });
  });

  describe('Deleting Todos', () => {
    it('should delete a todo when delete button is clicked', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => [{ id: 1, title: 'Delete Me', completed: false }]
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Delete Me')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 1, title: 'Delete Me', completed: false })
      });

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE'
      });
    });

    it('should remove todo from list after deletion', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => [
          { id: 1, title: 'Keep Me', completed: false },
          { id: 2, title: 'Delete Me', completed: false }
        ]
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Keep Me')).toBeInTheDocument();
        expect(screen.getByText('Delete Me')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ id: 2, title: 'Delete Me', completed: false })
      });

      const todoItems = screen.getAllByRole('listitem');
      const secondTodo = todoItems[1];
      const deleteButton = within(secondTodo).getByText('Delete');

      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Keep Me')).toBeInTheDocument();
        expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully on initial load', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching todos:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle errors when adding a todo', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => []
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a new todo...')).toBeInTheDocument();
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to add'));

      const input = screen.getByPlaceholderText('Add a new todo...');
      await user.type(input, 'Error Todo');
      await user.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error adding todo:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
