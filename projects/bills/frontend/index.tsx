import React from 'react';
import { createRoot } from 'react-dom/client';
import BillPaymentPlanner from './App';

function mount() {
  const el = document.getElementById('root');
  if (!el) return;
  try {
    createRoot(el).render(<BillPaymentPlanner />);
  } catch (err) {
    // Fallback for older React versions (shouldn't be needed here)
    // @ts-ignore
    const ReactDOM = require('react-dom');
    // @ts-ignore
    ReactDOM.render(<BillPaymentPlanner />, el);
  }
}

if (typeof document !== 'undefined') {
  // Mount on DOMContentLoaded if the script is executed before the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

export default mount;
