import React, { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { api, Account } from '../lib/api';
import { formatCurrency, formatDate, STATUS_LABEL, STATUS_COLOR, STATUS_SORT, TYPE_LABEL } from '../lib/format';

const STATUSES = Object.keys(STATUS_LABEL) as string[];

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function EditPanel({ acct, onSave, onCancel }: {
  acct: Account;
  onSave: (updated: Account) => void;
  onCancel: () => void;
}) {
  const [balance, setBalance] = useState(acct.current_balance != null ? String(acct.current_balance) : '');
  const [balanceDate, setBalanceDate] = useState(acct.balance_date ?? '');
  const [status, setStatus] = useState(acct.status);
  const [notes, setNotes] = useState(acct.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      const body: Parameters<typeof api.accounts.update>[1] = { status, notes: notes || null };
      if (balance !== '') body.current_balance = parseFloat(balance);
      if (balanceDate !== '') body.balance_date = balanceDate;
      const updated = await api.accounts.update(acct.account_id, body);
      onSave(updated);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-amber-50 border-t border-amber-100 px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Balance
          <input
            type="number"
            step="0.01"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            placeholder="—"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          As of
          <input
            type="date"
            value={balanceDate}
            onChange={e => setBalanceDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Status
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5 flex-1 min-w-40">
          Notes
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="—"
            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-600 text-white text-sm px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50 shrink-0"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.accounts.list()
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99)
        );
        setAccounts(sorted);
      })
      .catch(e => setError(e.message));
  }, []);

  function handleUpdate(updated: Account) {
    setAccounts(prev =>
      [...prev.map(a => a.account_id === updated.account_id ? updated : a)]
        .sort((a, b) => (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99))
    );
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!accounts.length) return <p className="text-gray-400 text-sm">Loading…</p>;

  const debts = accounts.filter(a => a.account_type !== 'income_source');
  const sources = accounts.filter(a => a.account_type === 'income_source');

  const totalDebt = debts
    .filter(a => !['paid_off', 'settled', 'charged_off'].includes(a.status))
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Accounts</h1>
        <span className="text-sm text-gray-500">
          Total active debt: <span className="font-mono text-red-600">{formatCurrency(totalDebt)}</span>
        </span>
      </div>

      <AccountTable title="Debt Accounts" accounts={debts} onUpdate={handleUpdate} />
      {sources.length > 0 && <AccountTable title="Bank Accounts" accounts={sources} onUpdate={handleUpdate} />}
    </div>
  );
}

function AccountTable({ title, accounts, onUpdate }: {
  title: string;
  accounts: Account[];
  onUpdate: (updated: Account) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleSave(updated: Account) {
    onUpdate(updated);
    setExpandedId(null);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Creditor</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Balance</th>
              <th className="px-4 py-2 text-left font-medium">As of</th>
              <th className="px-4 py-2 text-right font-medium">APR</th>
              <th className="px-4 py-2 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acct => {
              const isExpanded = expandedId === acct.account_id;
              return (
                <React.Fragment key={acct.account_id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : acct.account_id)}
                    className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        {acct.creditor}
                        {acct.portal_url && (
                          <a
                            href={acct.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{TYPE_LABEL[acct.account_type] ?? acct.account_type}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={acct.status} /></td>
                    <td className={`px-4 py-2.5 text-right font-mono ${acct.current_balance != null ? 'text-gray-900' : 'text-gray-300'}`}>
                      {acct.current_balance != null ? formatCurrency(acct.current_balance) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {acct.balance_date ? formatDate(acct.balance_date) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {acct.interest_rate_pct != null ? `${acct.interest_rate_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{acct.notes ?? ''}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-amber-100">
                      <td colSpan={7} className="p-0">
                        <EditPanel
                          acct={acct}
                          onSave={handleSave}
                          onCancel={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
