import React from 'react';
import { createRoot } from 'react-dom/client';

// Sample Bills App component
function App() {
  const [bills, setBills] = React.useState([]);
  const [newBill, setNewBill] = React.useState({ name: '', amount: '', dueDate: '' });

  React.useEffect(() => {
    // Fetch bills from the API
    fetch('/api/bills')
      .then(res => res.json())
      .then(data => setBills(data))
      .catch(err => console.error('Error fetching bills:', err));
  }, []);

  const addBill = async () => {
    if (!newBill.name.trim() || !newBill.amount) return;

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBill.name,
          amount: parseFloat(newBill.amount),
          dueDate: newBill.dueDate,
          paid: false
        }),
      });
      const bill = await response.json();
      setBills([...bills, bill]);
      setNewBill({ name: '', amount: '', dueDate: '' });
    } catch (err) {
      console.error('Error adding bill:', err);
    }
  };

  const togglePaid = async (id: number, paid: boolean) => {
    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: !paid }),
      });
      const updatedBill = await response.json();
      setBills(bills.map(b => b.id === id ? updatedBill : b));
    } catch (err) {
      console.error('Error updating bill:', err);
    }
  };

  const deleteBill = async (id: number) => {
    try {
      await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      setBills(bills.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting bill:', err);
    }
  };

  const getTotalAmount = () => {
    return bills.reduce((sum: number, bill: any) => sum + (bill.paid ? 0 : bill.amount), 0).toFixed(2);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Bills Manager</h1>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h3>Total Unpaid: ${getTotalAmount()}</h3>
      </div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newBill.name}
          onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
          placeholder="Bill name..."
          style={{ padding: '10px', flex: '2' }}
        />
        <input
          type="number"
          value={newBill.amount}
          onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
          placeholder="Amount..."
          style={{ padding: '10px', flex: '1' }}
        />
        <input
          type="date"
          value={newBill.dueDate}
          onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
          style={{ padding: '10px', flex: '1' }}
        />
        <button onClick={addBill} style={{ padding: '10px 20px' }}>
          Add Bill
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {bills.map((bill: any) => (
          <li key={bill.id} style={{
            padding: '15px',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: bill.paid ? '#e8f5e9' : '#fff'
          }}>
            <div style={{ flex: 1 }}>
              <input
                type="checkbox"
                checked={bill.paid}
                onChange={() => togglePaid(bill.id, bill.paid)}
                style={{ marginRight: '10px' }}
              />
              <span style={{
                textDecoration: bill.paid ? 'line-through' : 'none',
                fontWeight: 'bold'
              }}>
                {bill.name}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ color: bill.paid ? '#666' : '#000' }}>
                ${bill.amount.toFixed(2)}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', color: '#666' }}>
              {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'No due date'}
            </div>
            <button
              onClick={() => deleteBill(bill.id)}
              style={{ padding: '5px 15px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
