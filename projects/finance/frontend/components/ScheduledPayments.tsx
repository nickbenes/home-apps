import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, ScheduledPayment, Account } from '../lib/api';
import { formatCurrency, FREQUENCY_LABEL } from '../lib/format';

const WINDOWS = [30, 60, 90] as const;
type Window = typeof WINDOWS[number];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDueDate(dateStr: string, today: string, tomorrow: string): string {
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function groupByDate(payments: ScheduledPayment[]): [string, ScheduledPayment[]][] {
  const map = new Map<string, ScheduledPayment[]>();
  for (const p of payments) {
    if (!map.has(p.due_date)) map.set(p.due_date, []);
    map.get(p.due_date)!.push(p);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

interface QuickAddForm { name: string; amount: string; item_date: string; }

function QuickAddForecast({
  defaultDate,
  accounts,
  onSave,
  onCancel,
}: {
  defaultDate: string;
  accounts: Account[];
  onSave: (name: string, amount: number, date: string, account_id: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<QuickAddForm>({ name: '', amount: '', item_date: defaultDate });
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k: keyof QuickAddForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.item_date) return;
    setSaving(true);
    try {
      await onSave(form.name.trim(), parseFloat(form.amount), form.item_date, accountId || null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <p className="text-xs font-medium text-blue-700 mb-2">Add forecast item</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input ref={nameRef}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Name" value={form.name} onChange={set('name')} required />
        <input type="number" step="0.01"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Amount (neg=expense)" value={form.amount} onChange={set('amount')} required />
        <input type="date"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={form.item_date} onChange={set('item_date')} required />
      </div>
      <div className="flex items-center gap-2">
        <select className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1"
          value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">Account (optional)</option>
          {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.creditor}</option>)}
        </select>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          Save
        </button>
      </div>
    </form>
  );
}

export default function ScheduledPayments() {
  const [days, setDays] = useState<Window>(90);
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const today = todayStr();
  const tomorrow = tomorrowStr();

  function loadPayments() {
    return api.scheduled.list(days).then(setPayments).catch(e => setError(e.message));
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadPayments(), api.accounts.list().then(setAccounts)])
      .finally(() => setLoading(false));
  }, [days]);

  const grouped = groupByDate(payments);

  const totalIncome   = payments.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const totalExpenses = payments.filter(p => p.amount < 0).reduce((s, p) => s + p.amount, 0);
  const net = totalIncome + totalExpenses;

  async function handleAddForecast(name: string, amount: number, item_date: string, account_id: string | null) {
    await api.forecast.create({ name, amount, item_date, account_id });
    await loadPayments();
    setAddingDate(null);
    setShowQuickAdd(false);
  }

  async function handleDeleteForecast(forecast_item_id: string, name: string) {
    if (!confirm(`Remove forecast item "${name}"?`)) return;
    await api.forecast.delete(forecast_item_id);
    setPayments(prev => prev.filter(p => p.forecast_item_id !== forecast_item_id));
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Header + window toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Upcoming Payments</h1>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setShowQuickAdd(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 text-sm rounded border ${
              showQuickAdd ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {showQuickAdd ? <X size={13} /> : <Plus size={13} />} Forecast
          </button>
          {WINDOWS.map(w => (
            <button
              key={w}
              onClick={() => setDays(w)}
              className={`px-3 py-1 text-sm rounded ${
                days === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {/* Quick add form (top level) */}
      {showQuickAdd && (
        <QuickAddForecast
          defaultDate={today}
          accounts={accounts}
          onSave={handleAddForecast}
          onCancel={() => setShowQuickAdd(false)}
        />
      )}

      {/* Period summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Income</p>
          <p className="text-lg font-semibold text-green-600 font-mono">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Outflow</p>
          <p className="text-lg font-semibold text-red-600 font-mono">{formatCurrency(Math.abs(totalExpenses))}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net</p>
          <p className={`text-lg font-semibold font-mono ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* Payment list */}
      {loading ? (
        <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="text-center text-gray-400 italic text-sm py-8">No scheduled payments in this window.</div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([date, items]) => {
            const dayNet = items.reduce((s, p) => s + p.amount, 0);
            const isToday = date === today;
            const isAddingHere = addingDate === date;
            return (
              <div
                key={date}
                className={`bg-white rounded-lg border overflow-hidden ${
                  isToday ? 'border-blue-300' : 'border-gray-200'
                }`}
              >
                {/* Date header */}
                <div className={`px-4 py-2 flex items-center justify-between border-b ${
                  isToday ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                }`}>
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                    {formatDueDate(date, today, tomorrow)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${dayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dayNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayNet), true)}
                    </span>
                    <button
                      onClick={() => setAddingDate(isAddingHere ? null : date)}
                      className="p-0.5 text-gray-400 hover:text-blue-600 rounded"
                      title="Add forecast item on this date"
                    >
                      {isAddingHere ? <X size={12} /> : <Plus size={12} />}
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {items.map((p, i) => (
                    <div
                      key={`${p.forecast_item_id ?? p.recurring_item_id}-${i}`}
                      className="px-4 py-2.5 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm text-gray-800">{p.name}</span>
                        {p.item_type === 'forecast' && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                            forecast
                          </span>
                        )}
                        {p.creditor && (
                          <span className="text-xs text-gray-400">{p.creditor}</span>
                        )}
                      </div>
                      {p.item_type === 'recurring' && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {FREQUENCY_LABEL[p.frequency] ?? p.frequency}
                        </span>
                      )}
                      <span className={`text-sm font-mono shrink-0 ${p.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {p.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(p.amount), true)}
                      </span>
                      {p.item_type === 'forecast' && p.forecast_item_id && (
                        <button
                          onClick={() => handleDeleteForecast(p.forecast_item_id!, p.name)}
                          className="p-0.5 text-gray-300 hover:text-red-500 rounded shrink-0"
                          title="Remove forecast item"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Per-date quick add form */}
                {isAddingHere && (
                  <div className="px-4 pb-3">
                    <QuickAddForecast
                      defaultDate={date}
                      accounts={accounts}
                      onSave={handleAddForecast}
                      onCancel={() => setAddingDate(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
