import React, { useEffect, useState } from 'react';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { api, DebtPriorityItem } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface CascadeResult {
  account_id: string;
  creditor: string;
  current_balance: number;
  interest_rate_pct: number | null;
  base_payment: number;
  peak_payment: number;
  baseline_months: number | null;
  cascade_months: number | null;
  baseline_interest: number | null;
  cascade_interest: number | null;
  interest_saved: number | null;
  months_saved: number | null;
}

function futureBalance(balance: number, ratePct: number | null, payment: number, months: number): number {
  if (months <= 0) return balance;
  const r = ratePct != null ? ratePct / 100 / 12 : 0;
  if (r === 0) return Math.max(0, balance - payment * months);
  return balance * Math.pow(1 + r, months) - payment * (Math.pow(1 + r, months) - 1) / r;
}

function amortize(
  balance: number,
  ratePct: number | null,
  payment: number,
): { months: number | null; totalInterest: number | null } {
  if (balance <= 0 || payment <= 0) return { months: null, totalInterest: null };
  const r = ratePct != null ? ratePct / 100 / 12 : 0;
  if (r === 0) return { months: balance / payment, totalInterest: 0 };
  if (payment <= balance * r) return { months: null, totalInterest: null };
  const months = -Math.log(1 - r * balance / payment) / Math.log(1 + r);
  return { months, totalInterest: payment * months - balance };
}

// Accurate two-phase cascade: each debt pays minimum until prior debts free up cash,
// then switches to the boosted payment for the remaining balance.
function computeCascade(items: DebtPriorityItem[]): CascadeResult[] {
  const results: CascadeResult[] = [];
  let freedPool = 0;
  let freedAtMonth = 0;

  for (let i = 0; i < items.length; i++) {
    const { current_balance: B, interest_rate_pct: rate, monthly_payment } = items[i];
    const P = monthly_payment ?? 0;
    const baseline = amortize(B, rate, P);

    let cascadeMonths = baseline.months;
    let cascadeInterest = baseline.totalInterest;

    if (i > 0 && freedPool > 0 && P > 0) {
      const balAtOffset = futureBalance(B, rate, P, freedAtMonth);
      if (balAtOffset > 0) {
        const phase2 = amortize(balAtOffset, rate, P + freedPool);
        if (phase2.months != null) {
          cascadeMonths = freedAtMonth + phase2.months;
          // Interest phase 1: total payments minus principal reduction
          const principalPhase1 = B - balAtOffset;
          const r = rate != null ? rate / 100 / 12 : 0;
          const interestPhase1 = r === 0 ? 0 : P * freedAtMonth - principalPhase1;
          cascadeInterest = interestPhase1 + (phase2.totalInterest ?? 0);
        }
      }
    }

    const monthsSaved =
      baseline.months != null && cascadeMonths != null ? baseline.months - cascadeMonths : null;
    const interestSaved =
      baseline.totalInterest != null && cascadeInterest != null
        ? baseline.totalInterest - cascadeInterest
        : null;

    results.push({
      account_id: items[i].account_id,
      creditor: items[i].creditor,
      current_balance: B,
      interest_rate_pct: rate,
      base_payment: P,
      peak_payment: P + freedPool,
      baseline_months: baseline.months,
      cascade_months: cascadeMonths,
      baseline_interest: baseline.totalInterest,
      cascade_interest: cascadeInterest,
      interest_saved: interestSaved,
      months_saved: monthsSaved,
    });

    freedPool += P;
    freedAtMonth = cascadeMonths ?? (baseline.months ?? freedAtMonth);
  }

  return results;
}

function monthsToDate(months: number | null): string {
  if (months == null) return '—';
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function DebtCascade() {
  const [items, setItems] = useState<DebtPriorityItem[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    api.debtPriority().then(data => {
      const avalanche = [...data].sort((a, b) => {
        if (a.interest_rate_pct == null) return 1;
        if (b.interest_rate_pct == null) return -1;
        return b.interest_rate_pct - a.interest_rate_pct;
      });
      setItems(data);
      setOrder(avalanche.map(i => i.account_id));
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!items.length) return <p className="text-gray-400 text-sm">Loading…</p>;

  const itemMap = Object.fromEntries(items.map(i => [i.account_id, i]));
  const ordered = order.map(id => itemMap[id]).filter(Boolean);
  const cascade = computeCascade(ordered);

  const totalInterestSaved = cascade.reduce((s, r) => s + (r.interest_saved ?? 0), 0);
  const lastResult = cascade[cascade.length - 1];
  const monthsSavedOverall =
    lastResult?.baseline_months != null && lastResult?.cascade_months != null
      ? Math.round(lastResult.baseline_months - lastResult.cascade_months)
      : null;
  const missingPayment = cascade.filter(r => r.base_payment === 0).length;

  function handleDragStart(idx: number) {
    setDragging(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOver(idx);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragging == null || dragOver == null || dragging === dragOver) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const newOrder = [...order];
    const [moved] = newOrder.splice(dragging, 1);
    newOrder.splice(dragOver, 0, moved);
    setOrder(newOrder);
    setDragging(null);
    setDragOver(null);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Payoff Cascade</h1>
        <span className="text-xs text-gray-400">
          Drag to reorder — freed payments roll into the next debt when one pays off
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Debt-free (cascade)</p>
          <p className="text-xl font-mono font-semibold text-gray-900 mt-0.5">
            {monthsToDate(lastResult?.cascade_months ?? null)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Interest Saved</p>
          <p className="text-xl font-mono font-semibold text-green-700 mt-0.5">
            {totalInterestSaved > 0 ? formatCurrency(totalInterestSaved) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Months Faster</p>
          <p className="text-xl font-mono font-semibold text-blue-700 mt-0.5">
            {monthsSavedOverall != null && monthsSavedOverall > 0 ? `${monthsSavedOverall} mo` : '—'}
          </p>
        </div>
      </div>

      {missingPayment > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <AlertTriangle size={14} />
          {missingPayment} account{missingPayment > 1 ? 's have' : ' has'} no monthly payment set — cascade stops at that point. Add a recurring payment via the Recurring page.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-2 py-2 w-8"></th>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Creditor</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">APR</th>
                <th className="px-4 py-2 text-right font-medium">Min Pmt</th>
                <th className="px-4 py-2 text-right font-medium">Peak Pmt</th>
                <th className="px-4 py-2 text-right font-medium">Baseline</th>
                <th className="px-4 py-2 text-right font-medium">Cascade</th>
                <th className="px-4 py-2 text-right font-medium">Saved</th>
              </tr>
            </thead>
            <tbody>
              {cascade.map((row, i) => (
                <tr
                  key={row.account_id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={[
                    'border-b border-gray-50 transition-colors',
                    dragging === i ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50',
                    dragOver === i && dragging !== i ? 'border-t-2 border-blue-400' : '',
                  ].join(' ')}
                >
                  <td className="px-2 py-2.5 text-gray-300 cursor-grab">
                    <GripVertical size={14} />
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.creditor}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                    {formatCurrency(row.current_balance)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                    {row.interest_rate_pct != null
                      ? `${row.interest_rate_pct.toFixed(1)}%`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {row.base_payment > 0 ? formatCurrency(row.base_payment) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {row.peak_payment > row.base_payment
                      ? <span className="text-blue-700 font-semibold">{formatCurrency(row.peak_payment)}</span>
                      : <span className="text-gray-400">{formatCurrency(row.base_payment)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {monthsToDate(row.baseline_months)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-medium">
                    {monthsToDate(row.cascade_months)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.months_saved != null && row.months_saved > 0.5
                      ? <span className="text-green-700 text-xs font-medium">−{Math.round(row.months_saved)} mo</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
