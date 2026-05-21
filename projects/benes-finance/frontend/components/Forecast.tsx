import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api, ForecastItem, Account } from '../lib/api';
import { formatCurrency } from '../lib/format';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatItemDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface FormState {
  name: string;
  amount: string;
  item_date: string;
  account_id: string;
  notes: string;
  is_extra_debt_payment: boolean;
}

const EMPTY_FORM: FormState = { name: '', amount: '', item_date: todayStr(), account_id: '', notes: '', is_extra_debt_payment: false };

function ItemForm({
  initial,
  accounts,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  accounts: Account[];
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function handleAccountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setForm(f => ({ ...f, account_id: val, is_extra_debt_payment: val ? f.is_extra_debt_payment : false }));
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name *</label>
          <input ref={nameRef} className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.name} onChange={set('name')} placeholder="e.g. Bonus payment" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount * (negative = expense)</label>
          <input type="number" step="0.01"
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.amount} onChange={set('amount')} placeholder="-500.00" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date *</label>
          <input type="date"
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.item_date} onChange={set('item_date')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Account (optional)</label>
          <select className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.account_id} onChange={handleAccountChange}>
            <option value="">— none —</option>
            {accounts.map(a => (
              <option key={a.account_id} value={a.account_id}>{a.creditor}</option>
            ))}
          </select>
        </div>
      </div>
      {form.account_id && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_extra_debt_payment}
            onChange={e => setForm(f => ({ ...f, is_extra_debt_payment: e.target.checked }))}
            className="rounded"
          />
          Apply to debt payoff
          <span className="text-xs text-gray-400">(updates payoff dates on Debt &amp; Projections pages)</span>
        </label>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes</label>
        <textarea rows={2}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          value={form.notes} onChange={set('notes')} placeholder="Optional notes…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
          Cancel
        </button>
        <button
          disabled={saving || !form.name.trim() || !form.amount || !form.item_date}
          onClick={() => onSave(form)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );
}

export default function Forecast() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayStr();

  function load() {
    return Promise.all([
      api.forecast.list(false),
      api.accounts.list(),
    ]).then(([its, accs]) => {
      setItems(its);
      setAccounts(accs);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const displayed = showAll ? items : items.filter(i => i.is_active === 1);

  const upcoming  = displayed.filter(i => i.item_date >= today);
  const past      = displayed.filter(i => i.item_date < today);

  const upcomingIncome  = upcoming.filter(i => i.amount > 0).reduce((s, i) => s + i.amount, 0);
  const upcomingExpense = upcoming.filter(i => i.amount < 0).reduce((s, i) => s + i.amount, 0);
  const upcomingNet     = upcomingIncome + upcomingExpense;

  async function handleCreate(form: FormState) {
    setSaving(true);
    try {
      const created = await api.forecast.create({
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        item_date: form.item_date,
        account_id: form.account_id || null,
        notes: form.notes.trim() || null,
        is_extra_debt_payment: form.is_extra_debt_payment ? 1 : 0,
      });
      setItems(prev => [...prev, created].sort((a, b) => a.item_date.localeCompare(b.item_date)));
      setShowCreate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, form: FormState) {
    setSaving(true);
    try {
      const updated = await api.forecast.update(id, {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        item_date: form.item_date,
        account_id: form.account_id || null,
        notes: form.notes.trim() || null,
        is_extra_debt_payment: form.is_extra_debt_payment ? 1 : 0,
      });
      setItems(prev => prev.map(i => i.forecast_item_id === id ? updated : i)
        .sort((a, b) => a.item_date.localeCompare(b.item_date)));
      setEditingId(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.forecast.delete(id);
      setItems(prev => prev.filter(i => i.forecast_item_id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  function toFormState(item: ForecastItem): FormState {
    return {
      name: item.name,
      amount: String(item.amount),
      item_date: item.item_date,
      account_id: item.account_id ?? '',
      notes: item.notes ?? '',
      is_extra_debt_payment: item.is_extra_debt_payment === 1,
    };
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Forecast</h1>
        <p className="text-sm text-gray-500">One-time projected income &amp; expenses</p>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
            Show past
          </label>
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* Summary */}
      {upcoming.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Upcoming Income</p>
            <p className="text-lg font-semibold text-green-600 font-mono">{formatCurrency(upcomingIncome)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Upcoming Expenses</p>
            <p className="text-lg font-semibold text-red-600 font-mono">{formatCurrency(Math.abs(upcomingExpense))}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net</p>
            <p className={`text-lg font-semibold font-mono ${upcomingNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {upcomingNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(upcomingNet))}
            </p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <ItemForm
          initial={{ ...EMPTY_FORM, item_date: today }}
          accounts={accounts}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          saving={saving}
        />
      )}

      {/* Item list */}
      {displayed.length === 0 ? (
        <div className="text-center text-gray-400 italic text-sm py-12">
          No forecast items yet. Add one to see it on the Schedule and Cash Flow pages.
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <ItemSection
              title="Upcoming"
              items={upcoming}
              accounts={accounts}
              today={today}
              editingId={editingId}
              saving={saving}
              onEdit={id => setEditingId(id)}
              onEditSave={handleEdit}
              onEditCancel={() => setEditingId(null)}
              onDelete={handleDelete}
              toFormState={toFormState}
              formatDate={formatItemDate}
              isPast={false}
            />
          )}
          {showAll && past.length > 0 && (
            <ItemSection
              title="Past"
              items={[...past].reverse()}
              accounts={accounts}
              today={today}
              editingId={editingId}
              saving={saving}
              onEdit={id => setEditingId(id)}
              onEditSave={handleEdit}
              onEditCancel={() => setEditingId(null)}
              onDelete={handleDelete}
              toFormState={toFormState}
              formatDate={formatItemDate}
              isPast={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ItemSection({
  title, items, accounts, editingId, saving,
  onEdit, onEditSave, onEditCancel, onDelete, toFormState, formatDate, isPast,
}: {
  title: string;
  items: ForecastItem[];
  accounts: Account[];
  today: string;
  editingId: string | null;
  saving: boolean;
  onEdit: (id: string) => void;
  onEditSave: (id: string, f: FormState) => void;
  onEditCancel: () => void;
  onDelete: (id: string, name: string) => void;
  toFormState: (item: ForecastItem) => FormState;
  formatDate: (s: string) => string;
  isPast: boolean;
}) {
  return (
    <div>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isPast ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-50">
        {items.map(item => (
          <React.Fragment key={item.forecast_item_id}>
            {editingId === item.forecast_item_id ? (
              <div className="p-3">
                <ItemForm
                  initial={toFormState(item)}
                  accounts={accounts}
                  onSave={f => onEditSave(item.forecast_item_id, f)}
                  onCancel={onEditCancel}
                  saving={saving}
                />
              </div>
            ) : (
              <div className={`flex items-center gap-3 px-4 py-3 ${isPast ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800">{item.name}</span>
                  {item.creditor && (
                    <span className="ml-2 text-xs text-gray-400">{item.creditor}</span>
                  )}
                  {item.is_extra_debt_payment === 1 && (
                    <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      debt payoff
                    </span>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(item.item_date)}</span>
                <span className={`text-sm font-mono shrink-0 ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(item.amount), true)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(item.forecast_item_id)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(item.forecast_item_id, item.name)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
