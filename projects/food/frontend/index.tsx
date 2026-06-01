import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div style={{ maxWidth: 800, margin: '60px auto', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1>Food</h1>
      <p style={{ color: '#888' }}>Coming soon — weekly menus, recipe store, shopping list generator, Walmart/Wegmans integration.</p>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter basename="/food">
    <Routes>
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
