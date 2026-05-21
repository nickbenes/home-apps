import React, { useEffect, useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { api, RecurringItem, Summary } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface Hypothetical {
  id: string;
  name: string;
  amount: string;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabel(offset: number, from: string): string {
  const d = new Date(from + 'T12:00:00');
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function IncomeScenarios() {
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Scenario state
  const [enabledIds, setEnabledIds]       = useState<Set<string>>(new Set());
  const [hypotheticals, setHypotheticals] = useState<Hypothetical[]>([]);
  const [scenarioDate, setScenarioDate]   = useState(isoToday());
  const [startingBalance, setStartingBalance] = useState('0');

  useEffect(() => {
    Promise.all([api.recurring.list(), api.summary()])
      .then(([r, s]) => {
        setRecurring(r);
        setSummary(s);
        // Default: all income sources enabled in scenario
        setEnabledIds(new Set(r.filter(i => i.effective_monthly > 0).map(i => i.recurring_item_id)));
      })
      .catch(e => setError(e.message));
  }, []);

  if (error)   return <p className="text-red-600 text-sm">{error}</p>;
  if (!summary) return <p className="text-gray-400 text-sm">Loading…</p>;

  const incomeItems = recurring.filter(r => r.effective_monthly > 0);

  function toggleId(id: string) {
    setEnabledIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addHypothetical() {
    setHypotheticals(prev => [...prev, { id: crypto.randomUUID(), name: '', amount: '' }]);
  }

  function updateHypothetical(id: string, field: 'name' | 'amount', value: string) {
    setHypotheticals(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  }

  function removeHypothetical(id: string) {
    setHypotheticals(prev => prev.filter(h => h.id !== id));
  }

  // ── Computed values ─────────────────────────────────────────────────────────

  const baselineIncome  = incomeItems.reduce((s, i) => s + i.effective_monthly, 0);
  const scenarioIncome  = incomeItems
    .filter(i => enabledIds.has(i.recurring_item_id))
    .reduce((s, i) => s + i.effective_monthly, 0)
    + hypotheticals.reduce((s, h) => s + (parseFloat(h.amount) || 0), 0);

  const monthlyExpenses = summary.monthly_recurring_by_category
    .reduce((s, c) => s + c.total_effective_monthly, 0); // already negative

  const baselineNet = baselineIncome + monthlyExpenses;
  const scenarioNet = scenarioIncome + monthlyExpenses;

  const startBal = parseFloat(startingBalance) || 0;

  function monthsToDepletion(net: number): string {
    if (net >= 0) return '—';
    if (startBal <= 0) return 'immediately';
    const months = startBal / Math.abs(net);
    return `${months.toFixed(1)} mo`;
  }

  // 12-month projection
  const NUM_MONTHS = 12;
  const projection = Array.from({ length: NUM_MONTHS }, (_, i) => {
    const label    = monthLabel(i, scenarioDate);
    const isScenario = true; // both scenarios projected from the same start date
    const bBal = startBal + baselineNet * (i + 1);
    const sBal = startBal + scenarioNet  * (i + 1);
    return { label, baselineBal: bBal, scenarioBal: sBal };
  });

  const incomeDiff = scenarioIncome - baselineIncome;
  const netDiff    = scenarioNet    - baselineNet;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Income Scenarios</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: toggles + hypotheticals ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-700">Income Sources</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle off income to model a reduced-income scenario</p>
            </div>
            <div className="divide-y divide-gray-50">
              {incomeItems.map(item => (
                <label key={item.recurring_item_id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={enabledIds.has(item.recurring_item_id)}
                    onChange={() => toggleId(item.recurring_item_id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                  />
                  <span className={`flex-1 text-sm ${enabledIds.has(item.recurring_item_id) ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {item.name}
                  </span>
                  <span className="font-mono text-sm text-green-700">
                    {formatCurrency(item.effective_monthly)}/mo
                  </span>
                </label>
              ))}
              {incomeItems.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400 italic">No income items found — add them in Recurring.</p>
              )}
            </div>

            {/* Hypothetical income rows */}
            {hypotheticals.length > 0 && (
              <div className="border-t border-dashed border-gray-200 divide-y divide-gray-50">
                {hypotheticals.map(h => (
                  <div key={h.id} className="flex items-center gap-2 px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Income name…"
                      value={h.name}
                      onChange={e => updateHypothetical(h.id, 'name', e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                      <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="0"
                        value={h.amount}
                        onChange={e => updateHypothetical(h.id, 'amount', e.target.value)}
                        className="w-24 px-2 py-1 text-sm font-mono focus:outline-none"
                      />
                      <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l border-gray-200">/mo</span>
                    </div>
                    <button onClick={() => removeHypothetical(h.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={addHypothetical}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
              >
                <PlusCircle size={13} /> Add hypothetical income (e.g. new job)
              </button>
            </div>
          </div>

          {/* Scenario settings */}
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-700">Scenario Settings</h2>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-600">
              <span>Scenario start date</span>
              <input
                type="date"
                value={scenarioDate}
                onChange={e => setScenarioDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-600">
              <span>Starting cash balance</span>
              <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={startingBalance}
                  onChange={e => setStartingBalance(e.target.value)}
                  className="w-28 px-2 py-1 text-sm font-mono focus:outline-none"
                />
              </div>
            </label>
          </div>
        </div>

        {/* ── Right column: comparison ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-700">Monthly Comparison</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium"></th>
                  <th className="px-4 py-2 text-right font-medium">Baseline</th>
                  <th className="px-4 py-2 text-right font-medium">Scenario</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-400">Δ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">Monthly Income</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-700">{formatCurrency(baselineIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-700">{formatCurrency(scenarioIncome)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs ${incomeDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {incomeDiff >= 0 ? '+' : ''}{formatCurrency(incomeDiff)}
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">Monthly Expenses</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">−{formatCurrency(Math.abs(monthlyExpenses))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">−{formatCurrency(Math.abs(monthlyExpenses))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-300">—</td>
                </tr>
                <tr className="border-b border-gray-100 font-medium">
                  <td className="px-4 py-2.5 text-gray-800">Net / Month</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${baselineNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {baselineNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(baselineNet))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${scenarioNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {scenarioNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(scenarioNet))}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs ${netDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {netDiff >= 0 ? '+' : ''}{formatCurrency(netDiff)}
                  </td>
                </tr>
                <tr className="border-b border-gray-50 text-xs text-gray-500">
                  <td className="px-4 py-2 text-gray-500">Annual Net</td>
                  <td className={`px-4 py-2 text-right font-mono ${baselineNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {baselineNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(baselineNet * 12))}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${scenarioNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {scenarioNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(scenarioNet * 12))}
                  </td>
                  <td className="px-4 py-2" />
                </tr>
                {startBal > 0 && (
                  <tr className="text-xs">
                    <td className="px-4 py-2 text-gray-500">Cash runway</td>
                    <td className={`px-4 py-2 text-right font-mono ${baselineNet >= 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                      {monthsToDepletion(baselineNet)}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono ${scenarioNet >= 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                      {monthsToDepletion(scenarioNet)}
                    </td>
                    <td className="px-4 py-2" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expense breakdown (same for both) */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-700">Expenses by Category</h2>
              <p className="text-xs text-gray-400 mt-0.5">Same under both scenarios</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {summary.monthly_recurring_by_category.map(cat => (
                  <tr key={cat.category_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 text-gray-700">{cat.category_name}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-600">
                      {formatCurrency(Math.abs(cat.total_effective_monthly))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 12-month projection ── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">12-Month Cash Projection</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            From {scenarioDate}, starting balance {formatCurrency(startBal)}. Assumes no one-time changes.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Month</th>
                <th className="px-4 py-2 text-right font-medium">Baseline Balance</th>
                <th className="px-4 py-2 text-right font-medium">Scenario Balance</th>
                <th className="px-4 py-2 text-right font-medium text-gray-400">Δ</th>
              </tr>
            </thead>
            <tbody>
              {projection.map(({ label, baselineBal, scenarioBal }) => {
                const diff = scenarioBal - baselineBal;
                return (
                  <tr key={label} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 text-gray-600">{label}</td>
                    <td className={`px-4 py-2 text-right font-mono text-xs ${baselineBal < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {baselineBal < 0 ? '−' : ''}{formatCurrency(Math.abs(baselineBal))}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-xs ${scenarioBal < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {scenarioBal < 0 ? '−' : ''}{formatCurrency(Math.abs(scenarioBal))}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-xs ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
