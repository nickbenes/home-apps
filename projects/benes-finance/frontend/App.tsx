import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import ScheduledPayments from './components/ScheduledPayments';
import RecurringItems from './components/RecurringItems';
import DebtPriority from './components/DebtPriority';
import DebtCascade from './components/DebtCascade';
import CashFlowStress from './components/CashFlowStress';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="recurring" element={<RecurringItems />} />
          <Route path="schedule" element={<ScheduledPayments />} />
          <Route path="debt" element={<DebtPriority />} />
          <Route path="cashflow" element={<CashFlowStress />} />
          <Route path="cascade" element={<DebtCascade />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
