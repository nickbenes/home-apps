import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Tag, Download } from 'lucide-react';
import { api, RecurringItem, BudgetItem, Account } from '../lib/api';
import { formatCurrency, formatDate, FREQUENCY_LABEL } from '../lib/format';
import { downloadCsv } from '../lib/csv';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'every_4_weeks', 'annually', 'one_time'] as const;

// ── Tag chip ─────────────────────────────────────────────────────────────────

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

function TagChip({ tag, onRemove, onClick, active }: {
  tag: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium leading-none
        ${tagColor(tag)} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${active ? 'ring-2 ring-offset-1 ring-current' : ''}`}
    >
      {tag}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-60 leading-none"
          aria-label={`Remove tag ${tag}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ── Inline tag editor (used inside ItemForm) ──────────────────────────────────

function TagEditor({ itemId, tags, onUpdate }: {
  itemId: string;
  tags: string[];
  onUpdate: (updated: RecurringItem) => void;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.recurring.allTags().then(setSuggestions).catch(() => {}); }, []);

  async function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) { setInput(''); return; }
    try {
      const updated = await api.recurring.addTag(itemId, trimmed);
      onUpdate(updated);
      setInput('');
    } catch { /* silent */ }
  }

  async function removeTag(tag: string) {
    try {
      const updated = await api.recurring.removeTag(itemId, tag) as unknown as RecurringItem;
      onUpdate(updated);
    } catch { /* silent */ }
  }

  const filtered = suggestions.filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(t => (
        <TagChip key={t} tag={t} onRemove={() => removeTag(t)} />
      ))}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add tag…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(input); }
            if (e.key === 'Escape') setInput('');
          }}
          className="border border-dashed border-gray-300 rounded px-2 py-0.5 text-xs w-28 focus:outline-none focus:border-blue-400"
        />
        {input && filtered.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow-md min-w-[140px]">
            {filtered.slice(0, 8).map(s => (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); addTag(s); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
              >
                <TagChip tag={s} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

  const byCategory = budgetItems.reduce<Record<string, BudgetItem[]>>((acc, b) => {
    (acc[b.category_name] ??= []).push(b);
    return acc;
  }, {});

  async function handleSave() {
    if (!name.trim())                               { setErr('Name is required'); return; }
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
          type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <label className="text-xs text-gray-500 flex items-center gap-1.5 shrink-0">
          Amount
          <input
            type="number" step="0.01" placeholder="−100.00" value={amount} onChange={e => setAmount(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </label>
        <select value={frequency} onChange={e => setFrequency(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
          {FREQUENCIES.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
        </select>
        <span className="text-xs text-gray-400">negative = expense</span>
      </div>

      {/* Row 2: optional fields */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Budget item
          <select value={budgetId} onChange={e => setBudgetId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
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
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
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
        <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Row 3: tags (only on existing items) */}
      {initial && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-gray-400 shrink-0" />
          <TagEditor itemId={initial.recurring_item_id} tags={initial.tags} onUpdate={onSave} />
        </div>
      )}

      {/* Row 4: actions */}
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

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, budgetItems, accounts, expanded, onToggle, onUpdate, onDelete, onTagClick }: {
  item: RecurringItem;
  budgetItems: BudgetItem[];
  accounts: Account[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: RecurringItem) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  const budgetName = budgetItems.find(b => b.budget_item_id === item.budget_item_id)?.name;

  async function handleToggleActive() {
    try {
      const updated = await api.recurring.update(item.recurring_item_id, { is_active: item.is_active ? 0 : 1 });
      onUpdate(updated);
    } catch { /* silent */ }
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
        className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${expanded ? 'bg-amber-50' : ''} ${item.tags.length > 0 ? '' : 'last:border-0'}`}
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
      {item.tags.length > 0 && !expanded && (
        <tr className={`border-b border-gray-50 last:border-0 ${expanded ? 'bg-amber-50' : ''}`}>
          <td colSpan={6} className="px-4 pb-2 pt-0">
            <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
              {item.tags.map(t => (
                <TagChip key={t} tag={t} onClick={() => onTagClick(t)} />
              ))}
            </div>
          </td>
        </tr>
      )}
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

// ── Prefix-grouped view ───────────────────────────────────────────────────────

function GroupedView({ items, budgetItems, accounts, expandedId, onToggle, onUpdate, onDelete, onTagClick }: {
  items: RecurringItem[];
  budgetItems: BudgetItem[];
  accounts: Account[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onUpdate: (item: RecurringItem) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  // Build groups: items are bucketed by whichever of their tags matches the active prefix.
  // Items with no matching tag go into "Other".
  const groupMap: Record<string, RecurringItem[]> = {};
  for (const item of items) {
    const placed = new Set<string>();
    for (const t of item.tags) {
      const col = t.indexOf(':');
      const group = col > 0 ? t.slice(col + 1).trim() : t;
      if (!placed.has(group)) {
        (groupMap[group] ??= []).push(item);
        placed.add(group);
      }
    }
    if (item.tags.length === 0) (groupMap['(untagged)'] ??= []).push(item);
  }

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
      {Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupItems]) => {
        const subtotal = groupItems.reduce((s, i) => s + i.effective_monthly, 0);
        return (
          <div key={group} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{group}</span>
              <span className={`text-xs font-mono font-medium ${subtotal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {subtotal < 0 ? '−' : '+'}{formatCurrency(Math.abs(subtotal), true)}/mo
              </span>
            </div>
            <table className="w-full text-sm">
              {TABLE_HEAD}
              <tbody>
                {groupItems.map(item => (
                  <ItemRow
                    key={item.recurring_item_id}
                    item={item}
                    budgetItems={budgetItems}
                    accounts={accounts}
                    expanded={expandedId === item.recurring_item_id}
                    onToggle={() => onToggle(item.recurring_item_id)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onTagClick={onTagClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
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
  const [tagFilter,   setTagFilter]   = useState<string | null>(null);
  const [groupPrefix, setGroupPrefix] = useState<string | null>(null);

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

  function handleTagClick(tag: string) {
    setTagFilter(prev => prev === tag ? null : tag);
    setGroupPrefix(null);
  }

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    const rows = items.map(item => {
      const budget = budgetItems.find(b => b.budget_item_id === item.budget_item_id);
      return [
        item.name,
        item.amount.toFixed(2),
        FREQUENCY_LABEL[item.frequency] ?? item.frequency,
        item.effective_monthly.toFixed(2),
        budget?.name ?? '',
        item.projected_start_date ?? '',
        item.projected_stop_date ?? '',
        item.is_active ? 'active' : 'inactive',
        item.tags.join(', '),
        item.notes ?? '',
      ];
    });
    downloadCsv(
      `recurring-items-${date}.csv`,
      ['Name', 'Amount', 'Frequency', 'Monthly Effective', 'Budget Item', 'Start', 'Stop', 'Status', 'Tags', 'Notes'],
      rows,
    );
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const active   = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);

  // Determine all tag prefixes present in active items (tags matching "PREFIX: VALUE")
  const prefixSet = new Set<string>();
  for (const item of active) {
    for (const t of item.tags) {
      const col = t.indexOf(':');
      if (col > 0) prefixSet.add(t.slice(0, col).trim());
    }
  }
  const prefixes = [...prefixSet].sort();

  // All distinct tags across active items for the filter bar
  const allActiveTags = [...new Set(active.flatMap(i => i.tags))].sort();

  // Apply tag filter
  const filteredActive = tagFilter
    ? active.filter(i => i.tags.includes(tagFilter))
    : active;

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

  const rowProps = {
    budgetItems, accounts,
    onUpdate: handleUpdate, onDelete: handleDelete, onTagClick: handleTagClick,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Recurring Items</h1>

        {/* Group-by prefix picker */}
        {prefixes.length > 0 && (
          <select
            value={groupPrefix ?? ''}
            onChange={e => { setGroupPrefix(e.target.value || null); setTagFilter(null); }}
            className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 bg-white focus:outline-none"
          >
            <option value="">Flat list</option>
            {prefixes.map(p => <option key={p} value={p}>Group by: {p}</option>)}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
            >
              <Download size={12} /> CSV
            </button>
          )}
          <button
            onClick={() => { setShowCreate(true); setExpandedId(null); }}
            className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded hover:bg-green-700"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      {/* Tag filter bar */}
      {allActiveTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-gray-400 shrink-0" />
          {allActiveTags.map(t => (
            <TagChip key={t} tag={t} onClick={() => handleTagClick(t)} active={tagFilter === t} />
          ))}
          {tagFilter && (
            <button onClick={() => setTagFilter(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Active items — grouped or flat */}
      {groupPrefix && !tagFilter ? (
        <GroupedView
          items={active.filter(i => i.tags.some(t => t.startsWith(groupPrefix + ':'))
            || (groupPrefix === '' ))}
          {...rowProps}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-700">
              Active ({filteredActive.length}{tagFilter ? ` filtered by "${tagFilter}"` : ''})
            </h2>
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
              {filteredActive.map(item => (
                <ItemRow
                  key={item.recurring_item_id}
                  item={item}
                  {...rowProps}
                  expanded={expandedId === item.recurring_item_id}
                  onToggle={() => toggle(item.recurring_item_id)}
                />
              ))}
              {filteredActive.length === 0 && !showCreate && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">
                    {tagFilter ? `No active items tagged "${tagFilter}".` : 'No active recurring items.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
                  {...rowProps}
                  expanded={expandedId === item.recurring_item_id}
                  onToggle={() => toggle(item.recurring_item_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
