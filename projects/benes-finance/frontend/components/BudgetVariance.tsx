import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { api, BudgetVarianceCategory, BudgetVarianceItem } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { downloadCsv } from '../lib/csv';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Bar showing actual as a fraction of budgeted; red if over, green if under.
function SpendBar({ actual, budgeted }: { actual: number; budgeted: number }) {
  if (budgeted === 0 && actual === 0) return <div className="w-20" />;
  const over = actual > budgeted && budgeted > 0;
  const pct  = budgeted > 0 ? Math.min(actual / budgeted, 1) * 100 : 100;
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : actual > 0 ? 'bg-green-500' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Variance({ actual, budgeted }: { actual: number; budgeted: number }) {
  if (budgeted === 0) {
    return actual > 0
      ? <span className="text-red-600 text-xs font-medium">+{formatCurrency(actual)} unbudgeted</span>
      : null;
  }
  const v = actual - budgeted;
  if (Math.abs(v) < 0.01) return <span className="text-gray-400 text-xs">on track</span>;
  return (
    <span className={`text-xs font-medium ${v > 0 ? 'text-red-600' : 'text-green-700'}`}>
      {v > 0 ? '+' : ''}{formatCurrency(v)} {v > 0 ? 'over' : 'under'}
    </span>
  );
}

function ItemRow({ item }: { item: BudgetVarianceItem }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="pl-8 pr-4 py-2 text-gray-700">{item.item_name}</td>
      <td className="px-4 py-2">
        <SpendBar actual={item.actual_amount} budgeted={item.budgeted_monthly} />
      </td>
      <td className="px-4 py-2 text-right font-mono text-xs text-gray-400 tabular-nums">
        {item.budgeted_monthly > 0 ? formatCurrency(item.budgeted_monthly) : <span className="text-gray-200">—</span>}
      </td>
      <td className="px-4 py-2 text-right font-mono text-xs text-gray-900 tabular-nums">
        {item.actual_amount > 0 ? formatCurrency(item.actual_amount) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-2 text-right">
        <Variance actual={item.actual_amount} budgeted={item.budgeted_monthly} />
      </td>
      <td className="px-4 py-2 text-right text-gray-400 text-xs tabular-nums">
        {item.tx_count > 0 ? item.tx_count : <span className="text-gray-200">—</span>}
      </td>
    </tr>
  );
}

function CategorySection({ cat }: { cat: BudgetVarianceCategory }) {
  const [collapsed, setCollapsed] = useState(false);
  const variance = cat.actual - cat.budgeted;
  const over = variance > 0.01 && cat.budgeted > 0;
  const under = variance < -0.01 && cat.budgeted > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{cat.category_name}</span>
        <span className="flex items-center gap-4 text-xs">
          <span className="text-gray-400">{formatCurrency(cat.budgeted)} budgeted</span>
          <span className="text-gray-700 font-mono font-medium">{formatCurrency(cat.actual)} actual</span>
          {cat.budgeted > 0 && (
            <span className={`font-medium ${over ? 'text-red-600' : under ? 'text-green-700' : 'text-gray-400'}`}>
              {over ? '+' : ''}{formatCurrency(variance)}
            </span>
          )}
          <ChevronLeft size={14} className={`text-gray-400 transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
        </span>
      </button>

      {!collapsed && (
        <table className="w-full text-sm">
          <tbody>
            {cat.items.map(item => <ItemRow key={item.budget_item_id} item={item} />)}
          </tbody>
          {cat.items.length > 1 && (
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50">
                <td className="pl-8 pr-4 py-2 text-xs text-gray-500 font-medium">Total</td>
                <td className="px-4 py-2">
                  <SpendBar actual={cat.actual} budgeted={cat.budgeted} />
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-gray-500 tabular-nums">
                  {cat.budgeted > 0 ? formatCurrency(cat.budgeted) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-gray-900 font-medium tabular-nums">
                  {formatCurrency(cat.actual)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Variance actual={cat.actual} budgeted={cat.budgeted} />
                </td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}

export default function BudgetVariance() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<{ categories: BudgetVarianceCategory[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.budget.variance(month)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [month]);

  const totalBudgeted = data?.categories.reduce((s, c) => s + c.budgeted, 0) ?? 0;
  const totalActual   = data?.categories.reduce((s, c) => s + c.actual,   0) ?? 0;
  const totalVariance = totalActual - totalBudgeted;
  const isFuture      = month > currentMonth();

  function handleExport() {
    if (!data) return;
    const rows: (string | number | null)[][] = [];
    for (const cat of data.categories) {
      for (const item of cat.items) {
        rows.push([
          cat.category_name,
          item.item_name,
          item.budgeted_monthly.toFixed(2),
          item.actual_amount.toFixed(2),
          (item.actual_amount - item.budgeted_monthly).toFixed(2),
          item.tx_count,
        ]);
      }
      rows.push([cat.category_name, 'SUBTOTAL', cat.budgeted.toFixed(2), cat.actual.toFixed(2), (cat.actual - cat.budgeted).toFixed(2), '']);
      rows.push([]);
    }
    rows.push(['TOTAL', '', totalBudgeted.toFixed(2), totalActual.toFixed(2), totalVariance.toFixed(2), '']);
    downloadCsv(
      `budget-variance-${month}.csv`,
      ['Category', 'Budget Item', 'Budgeted', 'Actual', 'Variance', 'Transactions'],
      rows,
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + month nav */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Budget Variance</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(m => shiftMonth(m, -1))}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 w-36 text-center">{formatMonth(month)}</span>
          <button
            onClick={() => setMonth(m => shiftMonth(m, 1))}
            disabled={!isFuture && month >= currentMonth()}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {isFuture && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            Future month — actuals will be $0
          </span>
        )}
        {data && (
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
          >
            <Download size={12} /> CSV
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Budgeted</p>
          <p className="text-xl font-mono font-semibold text-gray-700 mt-0.5">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Actual</p>
          <p className="text-xl font-mono font-semibold text-gray-900 mt-0.5">{formatCurrency(totalActual)}</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${
          totalVariance > 0.01 ? 'bg-red-50 border-red-200'
          : totalVariance < -0.01 ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
        }`}>
          <p className="text-xs text-gray-500">Variance</p>
          <p className={`text-xl font-mono font-semibold mt-0.5 ${
            totalVariance > 0.01 ? 'text-red-700'
            : totalVariance < -0.01 ? 'text-green-700'
            : 'text-gray-400'
          }`}>
            {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
          </p>
        </div>
      </div>

      {/* Column header */}
      {data && data.categories.length > 0 && (
        <div className="grid grid-cols-[1fr_80px_96px_96px_1fr_40px] text-xs text-gray-400 uppercase tracking-wide px-4">
          <span>Item</span>
          <span></span>
          <span className="text-right">Budgeted</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Variance</span>
          <span className="text-right">Txns</span>
        </div>
      )}

      {/* Loading / empty / categories */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : !data || data.categories.length === 0 ? (
        <p className="text-gray-400 text-sm">No budget data for this month. Classify some transactions or add recurring items.</p>
      ) : (
        <div className="space-y-3">
          {data.categories.map(cat => <CategorySection key={cat.category_id} cat={cat} />)}
        </div>
      )}
    </div>
  );
}
