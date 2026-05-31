import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  api, Coverage as CoverageData,
  CoverageAccount, CoverageRecurringItem, CoverageBudgetItem, CoverageBudgetCategory,
} from '../lib/api';
import { formatCurrency, FREQUENCY_LABEL, TYPE_LABEL } from '../lib/format';

// ── Status helpers ────────────────────────────────────────────────────────────

type Status = 'ok' | 'warn' | 'gap';

function StatusIcon({ status }: { status: Status }) {
  if (status === 'ok')   return <CheckCircle  size={14} className="text-green-500 shrink-0" />;
  if (status === 'warn') return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
  return                        <XCircle       size={14} className="text-red-500  shrink-0" />;
}

function StatusBadge({ status, label }: { status: Status; label: string }) {
  const cls = status === 'ok'
    ? 'bg-green-50 text-green-700 border-green-200'
    : status === 'warn'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${cls}`}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({ title, gapCount, total, children }: {
  title: string;
  gapCount: number;
  total: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const allOk = gapCount === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-left"
      >
        {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <span className="font-medium text-gray-800 text-sm">{title}</span>
        <span className="text-xs text-gray-400">{total} total</span>
        <span className={`ml-auto text-xs font-medium ${allOk ? 'text-green-600' : 'text-red-600'}`}>
          {allOk ? 'All covered' : `${gapCount} gap${gapCount !== 1 ? 's' : ''}`}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Accounts section ─────────────────────────────────────────────────────────

function accountStatus(a: CoverageAccount): Status {
  return a.recurring_count > 0 ? 'ok' : 'gap';
}

function AccountRows({ accounts }: { accounts: CoverageAccount[] }) {
  const [gapsOnly, setGapsOnly] = useState(false);
  const displayed = gapsOnly ? accounts.filter(a => accountStatus(a) !== 'ok') : accounts;

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={gapsOnly} onChange={e => setGapsOnly(e.target.checked)} className="rounded" />
          Show gaps only
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          Fix via <Link to="/accounts" className="text-blue-600 hover:underline">Accounts</Link> or{' '}
          <Link to="/recurring" className="text-blue-600 hover:underline">Recurring</Link>
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-medium w-6" />
            <th className="px-4 py-2 text-left font-medium">Account</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Linked recurring items</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(a => (
            <tr key={a.account_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5"><StatusIcon status={accountStatus(a)} /></td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{a.creditor}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">{TYPE_LABEL[a.account_type] ?? a.account_type}</td>
              <td className="px-4 py-2.5">
                {a.recurring_count > 0
                  ? <span className="text-xs text-green-700">{a.recurring_count} item{a.recurring_count !== 1 ? 's' : ''}</span>
                  : <span className="text-xs text-red-600">none</span>}
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic text-sm">No gaps — all accounts have linked recurring items.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

// ── Recurring Items section ───────────────────────────────────────────────────

function recurringStatus(r: CoverageRecurringItem): Status {
  return r.budget_item_id ? 'ok' : 'gap';
}

function RecurringRows({ items }: { items: CoverageRecurringItem[] }) {
  const [gapsOnly, setGapsOnly] = useState(false);
  const displayed = gapsOnly ? items.filter(r => recurringStatus(r) !== 'ok') : items;

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={gapsOnly} onChange={e => setGapsOnly(e.target.checked)} className="rounded" />
          Show gaps only
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          Fix via <Link to="/recurring" className="text-blue-600 hover:underline">Recurring</Link>
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-medium w-6" />
            <th className="px-4 py-2 text-left font-medium">Item</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            <th className="px-4 py-2 text-left font-medium">Frequency</th>
            <th className="px-4 py-2 text-left font-medium">Budget item</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(r => (
            <tr key={r.recurring_item_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5"><StatusIcon status={recurringStatus(r)} /></td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
              <td className={`px-4 py-2.5 text-right font-mono text-xs ${r.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {r.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(r.amount), true)}
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">{FREQUENCY_LABEL[r.frequency] ?? r.frequency}</td>
              <td className="px-4 py-2.5 text-xs">
                {r.budget_item_name
                  ? <span className="text-green-700">{r.budget_item_name} <span className="text-gray-400">({r.category_name})</span></span>
                  : <span className="text-red-600">unlinked</span>}
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 italic text-sm">No gaps — all active recurring items have a budget item.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

// ── Budget Items section ──────────────────────────────────────────────────────

function budgetItemStatus(b: CoverageBudgetItem): Status {
  if (b.recurring_count > 0) return 'ok';
  if (b.rule_count > 0)      return 'warn';
  return 'gap';
}

function BudgetItemRows({ items }: { items: CoverageBudgetItem[] }) {
  const [gapsOnly, setGapsOnly] = useState(false);
  const displayed = gapsOnly ? items.filter(b => budgetItemStatus(b) !== 'ok') : items;

  // Group by category for readability
  const byCategory = displayed.reduce<Record<string, CoverageBudgetItem[]>>((acc, b) => {
    (acc[b.category_name] ??= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={gapsOnly} onChange={e => setGapsOnly(e.target.checked)} className="rounded" />
          Show gaps only
        </label>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> has recurring</span>
          <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-amber-500" /> rules only</span>
          <span className="flex items-center gap-1"><XCircle size={11} className="text-red-500" /> nothing</span>
          <span>Fix via <Link to="/recurring" className="text-blue-600 hover:underline">Recurring</Link> or <Link to="/rules" className="text-blue-600 hover:underline">Rules</Link></span>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-medium w-6" />
            <th className="px-4 py-2 text-left font-medium">Budget item</th>
            <th className="px-4 py-2 text-center font-medium">Recurring</th>
            <th className="px-4 py-2 text-center font-medium">Rules</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <React.Fragment key={cat}>
              <tr className="bg-gray-50 border-b border-gray-100">
                <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</td>
              </tr>
              {catItems.map(b => (
                <tr key={b.budget_item_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5"><StatusIcon status={budgetItemStatus(b)} /></td>
                  <td className="px-4 py-2.5 text-gray-800">{b.name}</td>
                  <td className="px-4 py-2.5 text-center text-xs">
                    {b.recurring_count > 0
                      ? <span className="text-green-700">{b.recurring_count}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs">
                    {b.rule_count > 0
                      ? <span className="text-green-700">{b.rule_count}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          {displayed.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic text-sm">No gaps — all budget items have recurring items or rules.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

// ── Budget Categories section ─────────────────────────────────────────────────

function categoryStatus(c: CoverageBudgetCategory): Status {
  return c.rule_count > 0 ? 'ok' : 'gap';
}

function CategoryRows({ categories }: { categories: CoverageBudgetCategory[] }) {
  const [gapsOnly, setGapsOnly] = useState(false);
  const displayed = gapsOnly ? categories.filter(c => categoryStatus(c) !== 'ok') : categories;

  return (
    <>
      <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={gapsOnly} onChange={e => setGapsOnly(e.target.checked)} className="rounded" />
          Show gaps only
        </label>
        <span className="text-xs text-gray-400 ml-auto">
          Fix via <Link to="/rules" className="text-blue-600 hover:underline">Rules</Link>
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-medium w-6" />
            <th className="px-4 py-2 text-left font-medium">Category</th>
            <th className="px-4 py-2 text-center font-medium">Budget items</th>
            <th className="px-4 py-2 text-center font-medium">Rules</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map(c => (
            <tr key={c.category_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5"><StatusIcon status={categoryStatus(c)} /></td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
              <td className="px-4 py-2.5 text-center text-xs text-gray-600">{c.item_count}</td>
              <td className="px-4 py-2.5 text-center text-xs">
                {c.rule_count > 0
                  ? <span className="text-green-700">{c.rule_count}</span>
                  : <span className="text-red-600">none</span>}
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic text-sm">No gaps — all categories have classification rules.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Coverage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.coverage()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;
  if (!data)   return null;

  const accountGaps   = data.accounts.filter(a => accountStatus(a) !== 'ok').length;
  const recurringGaps = data.recurringItems.filter(r => recurringStatus(r) !== 'ok').length;
  const budgetGaps    = data.budgetItems.filter(b => budgetItemStatus(b) === 'gap').length;
  const budgetWarns   = data.budgetItems.filter(b => budgetItemStatus(b) === 'warn').length;
  const categoryGaps  = data.budgetCategories.filter(c => categoryStatus(c) !== 'ok').length;
  const totalGaps     = accountGaps + recurringGaps + budgetGaps + categoryGaps;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Coverage</h1>
        <p className="text-sm text-gray-500 mt-0.5">Entity linkage audit — see what's wired up and what isn't.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Account gaps',        count: accountGaps,   total: data.accounts.length },
          { label: 'Unclassified items',  count: recurringGaps, total: data.recurringItems.length },
          { label: 'Empty budget items',  count: budgetGaps,    total: data.budgetItems.length,
            extra: budgetWarns > 0 ? `${budgetWarns} rules-only` : undefined },
          { label: 'Categories w/o rules',count: categoryGaps,  total: data.budgetCategories.length },
        ].map(({ label, count, total, extra }) => (
          <div key={label} className={`rounded-lg border px-3 py-2.5 ${count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-mono font-semibold mt-0.5 ${count > 0 ? 'text-red-700' : 'text-green-700'}`}>{count}</p>
            <p className="text-xs text-gray-400">of {total}{extra ? ` · ${extra}` : ''}</p>
          </div>
        ))}
      </div>

      {totalGaps === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          <CheckCircle size={14} /> All entities are fully linked — nothing to fix.
        </div>
      )}

      {/* Sections */}
      <Section title="Accounts" gapCount={accountGaps} total={data.accounts.length}>
        <AccountRows accounts={data.accounts} />
      </Section>

      <Section title="Recurring Items" gapCount={recurringGaps} total={data.recurringItems.length}>
        <RecurringRows items={data.recurringItems} />
      </Section>

      <Section title="Budget Items" gapCount={budgetGaps + budgetWarns} total={data.budgetItems.length}>
        <BudgetItemRows items={data.budgetItems} />
      </Section>

      <Section title="Budget Categories" gapCount={categoryGaps} total={data.budgetCategories.length}>
        <CategoryRows categories={data.budgetCategories} />
      </Section>
    </div>
  );
}
