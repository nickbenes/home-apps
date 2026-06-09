import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Globe, Mail, Hash, Edit2, Check, X,
  ExternalLink, Tag, Plus, Trash2, CalendarClock,
} from 'lucide-react';
import {
  api, Account, AccountDetail as AccountDetailType,
  AccountDetailRecurringItem, ForecastItem, Transaction,
} from '../lib/api';
import {
  formatCurrency, formatDate, STATUS_LABEL, STATUS_COLOR, TYPE_LABEL,
} from '../lib/format';

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

const STATUSES = Object.keys(STATUS_LABEL);
const ACCOUNT_TYPES = [
  'personal_loan', 'mortgage', 'credit_card', 'student_loan', 'tax_debt',
  'auto_loan', 'settlement', 'collections', 'judgment', 'bnpl', 'income_source',
];

// ── Editable field ────────────────────────────────────────────────────────────
// Click the pencil → small inline input. Escape cancels, Enter/blur saves.

function EditableField({
  value, placeholder, onSave, type = 'text', monospace = false,
}: {
  value: string | null;
  placeholder?: string;
  onSave: (v: string | null) => void;
  type?: 'text' | 'number' | 'date' | 'url' | 'tel' | 'email';
  monospace?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function commit() {
    const trimmed = draft.trim();
    onSave(trimmed === '' ? null : trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(value ?? '');
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="group flex items-center gap-1 min-h-[1.5rem]">
        <span className={`${monospace ? 'font-mono' : ''} ${value ? 'text-gray-900' : 'text-gray-300 italic text-xs'}`}>
          {value ?? (placeholder ?? '—')}
        </span>
        <button
          onClick={() => { setDraft(value ?? ''); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
        >
          <Edit2 size={11} />
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        onBlur={commit}
        className={`border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${monospace ? 'font-mono' : ''}`}
      />
      <button onClick={commit} className="text-green-600 hover:text-green-700"><Check size={13} /></button>
      <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
    </span>
  );
}

function EditableSelect({
  value, options, labelMap, onSave,
}: {
  value: string;
  options: string[];
  labelMap?: Record<string, string>;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span className="group flex items-center gap-1">
        <span className="text-gray-900">{labelMap?.[value] ?? value}</span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
        >
          <Edit2 size={11} />
        </button>
      </span>
    );
  }

  return (
    <select
      autoFocus
      value={value}
      onChange={e => { onSave(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="border border-blue-400 rounded px-1.5 py-0.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map(o => <option key={o} value={o}>{labelMap?.[o] ?? o}</option>)}
    </select>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({ acct, onUpdate }: { acct: Account; onUpdate: (a: Account) => void }) {
  async function save(field: keyof Account, value: string | null) {
    const updated = await api.accounts.update(acct.account_id, { [field]: value });
    onUpdate(updated);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</h3>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2.5">
          <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <EditableField
            value={acct.phone}
            placeholder="Add phone"
            type="tel"
            onSave={v => save('phone', v)}
          />
        </div>
        <div className="flex items-start gap-2.5">
          <Globe size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <span className="flex items-center gap-1">
            <EditableField
              value={acct.portal_url}
              placeholder="Add website"
              type="url"
              onSave={v => save('portal_url', v)}
            />
            {acct.portal_url && (
              <a href={acct.portal_url} target="_blank" rel="noreferrer"
                className="text-gray-400 hover:text-blue-600">
                <ExternalLink size={12} />
              </a>
            )}
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <EditableField
            value={acct.email}
            placeholder="Add email"
            type="email"
            onSave={v => save('email', v)}
          />
        </div>
        <div className="flex items-start gap-2.5">
          <Hash size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <EditableField
            value={acct.account_number}
            placeholder="Account #"
            monospace
            onSave={v => save('account_number', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Financial card ────────────────────────────────────────────────────────────

function FinancialCard({
  acct, monthlyPayment, onUpdate,
}: {
  acct: Account;
  monthlyPayment: number;
  onUpdate: (a: Account) => void;
}) {
  async function save(field: keyof Account, value: string | null) {
    const parsed = value === null ? null : (['current_balance', 'interest_rate_pct', 'original_amount'].includes(field)
      ? parseFloat(value) : value);
    const updated = await api.accounts.update(acct.account_id, { [field]: parsed });
    onUpdate(updated);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Financials</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">Balance</dt>
          <dd className="font-mono">
            <EditableField
              value={acct.current_balance != null ? String(acct.current_balance) : null}
              placeholder="—"
              type="number"
              monospace
              onSave={v => save('current_balance', v)}
            />
          </dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">As of</dt>
          <dd>
            <EditableField
              value={acct.balance_date}
              placeholder="—"
              type="date"
              onSave={v => save('balance_date', v)}
            />
          </dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">APR</dt>
          <dd className="font-mono">
            {acct.interest_rate_pct != null ? (
              <EditableField
                value={String(acct.interest_rate_pct)}
                type="number"
                monospace
                onSave={v => save('interest_rate_pct', v)}
              />
            ) : (
              <EditableField value={null} placeholder="—" type="number" monospace onSave={v => save('interest_rate_pct', v)} />
            )}
          </dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">Original</dt>
          <dd className="font-mono">
            <EditableField
              value={acct.original_amount != null ? String(acct.original_amount) : null}
              placeholder="—"
              type="number"
              monospace
              onSave={v => save('original_amount', v)}
            />
          </dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">Payoff est.</dt>
          <dd>
            <EditableField
              value={acct.payoff_date_est}
              placeholder="—"
              type="date"
              onSave={v => save('payoff_date_est', v)}
            />
          </dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">Balloon mortgage</dt>
          <dd>
            <button
              onClick={() => save('is_balloon', acct.is_balloon ? 0 : 1)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                acct.is_balloon
                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {acct.is_balloon ? 'Yes' : 'No'}
            </button>
          </dd>
        </div>
        {monthlyPayment > 0 && (
          <div className="flex justify-between items-center gap-2 pt-1 border-t border-gray-100">
            <dt className="text-gray-500 shrink-0">Min pmt/mo</dt>
            <dd className="font-mono text-gray-900">{formatCurrency(monthlyPayment)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ── Tags card ─────────────────────────────────────────────────────────────────

function TagsCard({ accountId, tags, onTagsChange }: {
  accountId: string;
  tags: string[];
  onTagsChange: (t: string[]) => void;
}) {
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const tag = newTag.trim();
    if (!tag) return;
    const updated = await api.accounts.addTag(accountId, tag);
    onTagsChange(updated);
    setNewTag('');
    setAdding(false);
  }

  async function handleRemove(tag: string) {
    await api.accounts.removeTag(accountId, tag);
    onTagsChange(tags.filter(t => t !== tag));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tags</h3>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-gray-400 hover:text-gray-700"
        >
          <Plus size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="group inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
            <Tag size={10} />
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {tags.length === 0 && !adding && (
          <span className="text-gray-300 text-xs italic">No tags</span>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTag(''); } }}
            placeholder="prefix:value"
            className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button onClick={handleAdd} className="text-green-600 hover:text-green-700"><Check size={13} /></button>
          <button onClick={() => { setAdding(false); setNewTag(''); }} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────

function NotesSection({ acct, onUpdate }: { acct: Account; onUpdate: (a: Account) => void }) {
  const [notes, setNotes] = useState(acct.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setNotes(acct.notes ?? ''); }, [acct.notes]);

  async function handleBlur() {
    const trimmed = notes.trim();
    const current = acct.notes ?? '';
    if (trimmed === current) return;
    setSaving(true);
    try {
      const updated = await api.accounts.update(acct.account_id, { notes: trimmed || null });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</h3>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
        {saved && !saving && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={8}
        placeholder="Call notes, payment history, agreements…"
        className="w-full text-sm text-gray-900 border border-gray-200 rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-300"
      />
    </div>
  );
}

// ── Recurring items ───────────────────────────────────────────────────────────

function RecurringSection({ items }: { items: AccountDetailRecurringItem[] }) {
  if (!items.length) return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recurring Payments</h3>
      <p className="text-gray-300 text-sm italic">None linked</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recurring Payments</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            <th className="px-4 py-2 text-left font-medium">Freq</th>
            <th className="px-4 py-2 text-left font-medium">Budget Item</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.recurring_item_id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-2 text-gray-800">{item.name}</td>
              <td className={`px-4 py-2 text-right font-mono ${item.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatCurrency(item.amount)}
              </td>
              <td className="px-4 py-2 text-gray-500 capitalize">{item.frequency.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2 text-gray-500">
                {item.budget_item_name
                  ? <span>{item.category_name} / {item.budget_item_name}</span>
                  : <span className="text-gray-300 italic">unlinked</span>}
              </td>
              <td className="px-4 py-2">
                <span className={`text-xs ${item.is_active ? 'text-green-600' : 'text-gray-400 italic'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Forecast items ────────────────────────────────────────────────────────────

function ForecastSection({ accountId, items, onChanged }: {
  accountId: string;
  items: ForecastItem[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim() || !amount || !date) return;
    setSaving(true);
    try {
      await api.forecast.create({
        name: name.trim(),
        amount: parseFloat(amount),
        item_date: date,
        account_id: accountId,
      });
      setName(''); setAmount(''); setDate('');
      setAdding(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.forecast.delete(id);
    onChanged();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <CalendarClock size={12} /> Projected Payments
        </h3>
        <button onClick={() => setAdding(a => !a)} className="text-gray-400 hover:text-gray-700">
          <Plus size={13} />
        </button>
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 bg-blue-50 rounded p-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Description"
            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-24 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className="text-gray-300 text-sm italic">No projected payments</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map(fi => (
            <li key={fi.forecast_item_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-700 flex-1">{fi.name}</span>
              <span className={`font-mono ${fi.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatCurrency(fi.amount)}
              </span>
              <span className="text-gray-400 text-xs">{formatDate(fi.item_date)}</span>
              <button
                onClick={() => handleDelete(fi.forecast_item_id)}
                className="text-gray-300 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────

function TransactionsSection({ accountId }: { accountId: string }) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const rows = await api.transactions.list({ account_id: accountId, limit: LIMIT + 1, offset: off });
      const page = rows.slice(0, LIMIT);
      setHasMore(rows.length > LIMIT);
      setTxns(off === 0 ? page : prev => [...prev, ...page]);
      setOffset(off + LIMIT);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Transactions</h3>
        <span className="text-xs text-gray-400">{txns.length}{hasMore ? '+' : ''} shown</span>
      </div>
      {txns.length === 0 && !loading && (
        <p className="px-4 py-3 text-gray-300 text-sm italic">No transactions</p>
      )}
      {txns.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Merchant</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 text-left font-medium">Classified</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(tx => (
              <tr key={tx.transaction_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                <td className="px-4 py-2 text-gray-700 max-w-xs truncate">
                  {tx.merchant_normalized ?? tx.merchant_text}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${tx.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {formatCurrency(tx.amount)}
                </td>
                <td className="px-4 py-2">
                  {tx.mapping_count > 0
                    ? <span className="text-green-600 text-xs">✓</span>
                    : <span className="text-amber-400 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hasMore && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            onClick={() => load(offset)}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AccountDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api.accounts.detail(id).then(setDetail).catch(e => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!detail) return <p className="text-gray-400 text-sm">Loading…</p>;

  const { account: acct, tags, recurringItems, budgetItems, forecastItems } = detail;

  const monthlyPayment = Math.abs(
    recurringItems
      .filter(i => i.is_active && i.amount < 0)
      .reduce((s, i) => s + i.effective_monthly, 0)
  );

  function handleAccountUpdate(updated: typeof acct) {
    setDetail(prev => prev ? { ...prev, account: updated } : prev);
  }

  async function saveCreditor(v: string | null) {
    if (!v) return;
    const updated = await api.accounts.update(acct.account_id, { creditor: v });
    handleAccountUpdate(updated);
  }

  async function saveStatus(v: string) {
    const updated = await api.accounts.update(acct.account_id, { status: v });
    handleAccountUpdate(updated);
  }

  async function saveType(v: string) {
    const updated = await api.accounts.update(acct.account_id, { account_type: v });
    handleAccountUpdate(updated);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/accounts" className="text-gray-400 hover:text-gray-700 mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">
              <EditableField value={acct.creditor} onSave={saveCreditor} />
            </h1>
            <EditableSelect
              value={acct.status}
              options={STATUSES}
              labelMap={STATUS_LABEL}
              onSave={saveStatus}
            />
            <span className="text-gray-400 text-sm">
              <EditableSelect
                value={acct.account_type}
                options={ACCOUNT_TYPES}
                labelMap={TYPE_LABEL}
                onSave={saveType}
              />
            </span>
          </div>
          {acct.account_number && (
            <p className="text-xs text-gray-400 font-mono">#{acct.account_number}</p>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Left column — contact + financials + tags */}
        <div className="space-y-4">
          <ContactCard acct={acct} onUpdate={handleAccountUpdate} />
          <FinancialCard acct={acct} monthlyPayment={monthlyPayment} onUpdate={handleAccountUpdate} />
          <TagsCard
            accountId={acct.account_id}
            tags={tags}
            onTagsChange={updated => setDetail(prev => prev ? { ...prev, tags: updated } : prev)}
          />
          {budgetItems.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Budget Items</h3>
              <ul className="space-y-1">
                {budgetItems.map(bi => (
                  <li key={bi.budget_item_id} className="text-sm text-gray-600">
                    <span className="text-gray-400">{bi.category_name} /</span> {bi.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column — notes + payments + transactions */}
        <div className="space-y-4">
          <NotesSection acct={acct} onUpdate={handleAccountUpdate} />
          <RecurringSection items={recurringItems} />
          <ForecastSection
            accountId={acct.account_id}
            items={forecastItems}
            onChanged={load}
          />
          <TransactionsSection accountId={acct.account_id} />
        </div>
      </div>
    </div>
  );
}
