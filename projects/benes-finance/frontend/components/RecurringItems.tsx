import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, RecurringItem, BudgetItem, Account } from '../lib/api';
import { formatCurrency, formatDate, FREQUENCY_LABEL } from '../lib/format';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'every_4_weeks', 'annually', 'one_time'] as const;

// ── Shared create/edit form ───────────────────────────────────────────────────

function ItemForm({ initial, budgetItems, accounts, onSave, onCancel, onToggleActive, onDelete }: {
  initial?: RecurringItem;
  budgetItems: BudgetItem[];
  accounts: Account[];
  onSave: (item: RecurringItem) => void;
  onCancel: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}) {
  const [name,      setName]      = useState(initial?.name ?? '');
  const [amount,    setAmount]    = useState(initial?.amount != null ? String(initial.amount) : '');
  const [frequency, setFrequency] = useState(initial?.frequency ?? 'monthly');
  const [budgetId,  setBudgetId]  = useState(initial?.budget_item_id ?? '');
  const [accountId, setAccountId] = useState(initial?.account_id ?? '');
  const [startDate, setStartDate] = useState(initial?.projected_start_date ?? '');
  const [stopDate,  setStopDate]  = useState(initial?.projected_stop_date ?? '');
  const [notes,     setNotes]     = useState(initial?.notes ?? '');
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  const isCreate = !initial;
  const accent = isCreate ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100';
  const btnCls = isCreate
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-amber-600 hover:bg-amber-700 text-white';

  // Budget items grouped by category for optgroup select
  const byCategory = budgetItems.reduce<Record<string, BudgetItem[]>>((acc, b) => {
    (acc[b.category_name] ??= []).push(b);
    return acc;
  }, {});

  async function handleSave() {
    if (!name.trim())                          { setErr('Name is required'); return; }
    if (amount === '' || isNaN(parseFloat(amount))) { setErr('Amount is required'); return; }
    setSaving(true); setErr('');
    try {
      const body = {
        name: name.trim(),
        amount: parseFloat(amount),
        frequency,
        budget_item_id:       budgetId  || null,
        account_id:           accountId || null,
        projected_start_date: startDate || null,
        projected_stop_date:  stopDate  || null,
        notes:                notes.trim() || null,
      };
      const result = initial
        ? await api.recurring.update(initial.recurring_item_id, body)
        : await api.recurring.create(body);
      onSave(result);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`border-t px-4 py-3 space-y-2.5 ${accent}`}>
      {/* Row 1: required fields */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <label className="text-xs text-gray-500 flex items-center gap-1.5 shrink-0">
          Amount
          <input
            type="number"
            step="0.01"
            placeholder="−100.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </label>
        <select
          value={frequency}
          onChange={e => setFrequency(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {FREQUENCIES.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
        </select>
        <span className="text-xs text-gray-400">negative = expense</span>
      </div>

      {/* Row 2: optional fields */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Budget item
          <select
            value={budgetId}
            onChange={e => setBudgetId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">— none —</option>
            {Object.entries(byCategory).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map(b => <option key={b.budget_item_id} value={b.budget_item_id}>{b.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Account
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">— none —</option>
            {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.creditor}</option>)}
          </select>
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Start
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Stop
          <input type="date" value={stopDate} onChange={e => setStopDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </label>

        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Row 3: actions */}
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving}
          className={`text-sm px-3 py-1 rounded disabled:opacity-50 ${btnCls}`}>
          {saving ? 'Saving…' : (isCreate ? 'Add' : 'Save')}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>

        {!isCreate && (
          <div className="ml-auto flex items-center gap-2">
            {onToggleActive && (
              <button onClick={onToggleActive}
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-2 py-1">
                {initial?.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
                Delete
              </button>
            )}
          </div>
        )}

        {err && <span className="text-red-600 text-xs ml-2">{err}</span>}
      </div>
    </div>
  );
}

// ── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, budgetItems, accounts, expanded, onToggle, onUpdate, onDelete }: {
  item: RecurringItem;
  budgetItems: BudgetItem[];
  accounts: Account[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: RecurringItem) => void;
  onDelete: (id: string) => void;
}) {
  const budgetName = budgetItems.find(b => b.budget_item_id === item.budget_item_id)?.name;

  async function handleToggleActive() {
    try {
      const updated = await api.recurring.update(item.recurring_item_id, {
        is_active: item.is_active ? 0 : 1,
      });
      onUpdate(updated);
    } catch { /* onUpdate will not be called; error stays silent — acceptable for toggle */ }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.recurring.delete(item.recurring_item_id);
      onDelete(item.recurring_item_id);
    } catch { /* silent */ }
  }

  return (
    <React.Fragment>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${expanded ? 'bg-amber-50' : ''}`}
      >
        <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
        <td className="px-4 py-2.5 text-gray-500 text-xs">{FREQUENCY_LABEL[item.frequency] ?? item.frequency}</td>
        <td className={`px-4 py-2.5 text-right font-mono text-sm ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {item.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(item.amount), true)}
        </td>
        <td className={`px-4 py-2.5 text-right font-mono text-xs ${item.effective_monthly < 0 ? 'text-red-400' : 'text-green-500'}`}>
          {item.effective_monthly < 0 ? '−' : '+'}{formatCurrency(Math.abs(item.effective_monthly), true)}
        </td>
        <td className="px-4 py-2.5 text-gray-400 text-xs">{budgetName ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
          {item.projected_start_date ? formatDate(item.projected_start_date) : '—'}
          {item.projected_stop_date  ? ` → ${formatDate(item.projected_stop_date)}` : ''}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-amber-100">
          <td colSpan={6} className="p-0">
            <ItemForm
              initial={item}
              budgetItems={budgetItems}
              accounts={accounts}
              onSave={onUpdate}
              onCancel={onToggle}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecurringItems() {
  const [items,       setItems]       = useState<RecurringItem[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [showCreate,  setShowCreate]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.recurring.listAll(), api.budget.items(), api.accounts.list()])
      .then(([r, bi, a]) => { setItems(r); setBudgetItems(bi); setAccounts(a); })
      .catch(e => setError(e.message));
  }, []);

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id);
    setShowCreate(false);
  }

  function handleCreate(item: RecurringItem) {
    setItems(prev => [item, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreate(false);
  }

  function handleUpdate(updated: RecurringItem) {
    setItems(prev => prev.map(i => i.recurring_item_id === updated.recurring_item_id ? updated : i));
    setExpandedId(null);
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.recurring_item_id !== id));
    setExpandedId(null);
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const active   = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);

  const TABLE_HEAD = (
    <thead>
      <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
        <th className="px-4 py-2 text-left font-medium">Name</th>
        <th className="px-4 py-2 text-left font-medium">Frequency</th>
        <th className="px-4 py-2 text-right font-medium">Amount</th>
        <th className="px-4 py-2 text-right font-medium">Monthly</th>
        <th className="px-4 py-2 text-left font-medium">Budget item</th>
        <th className="px-4 py-2 text-left font-medium">Period</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Recurring Items</h1>
        <button
          onClick={() => { setShowCreate(true); setExpandedId(null); }}
          className="ml-auto flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded hover:bg-green-700"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Active items */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Active ({active.length})</h2>
        </div>

        {showCreate && (
          <ItemForm
            budgetItems={budgetItems}
            accounts={accounts}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}

        <table className="w-full text-sm">
          {TABLE_HEAD}
          <tbody>
            {active.map(item => (
              <ItemRow
                key={item.recurring_item_id}
                item={item}
                budgetItems={budgetItems}
                accounts={accounts}
                expanded={expandedId === item.recurring_item_id}
                onToggle={() => toggle(item.recurring_item_id)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
            {active.length === 0 && !showCreate && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">
                  No active recurring items. Click "Add Item" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inactive items */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden opacity-70">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-500">Inactive ({inactive.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Frequency</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium" colSpan={3}>Ended</th>
              </tr>
            </thead>
            <tbody>
              {inactive.map(item => (
                <ItemRow
                  key={item.recurring_item_id}
                  item={item}
                  budgetItems={budgetItems}
                  accounts={accounts}
                  expanded={expandedId === item.recurring_item_id}
                  onToggle={() => toggle(item.recurring_item_id)}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
