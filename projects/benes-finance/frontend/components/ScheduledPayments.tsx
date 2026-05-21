import React, { useEffect, useState } from 'react';
import { api, ScheduledPayment } from '../lib/api';
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

export default function ScheduledPayments() {
  const [days, setDays] = useState<Window>(90);
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.scheduled.list(days)
      .then(setPayments)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const today = todayStr();
  const tomorrow = tomorrowStr();
  const grouped = groupByDate(payments);

  const totalIncome   = payments.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
  const totalExpenses = payments.filter(p => p.amount < 0).reduce((s, p) => s + p.amount, 0);
  const net = totalIncome + totalExpenses;

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Header + window toggle */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Upcoming Payments</h1>
        <div className="flex items-center gap-1 ml-auto">
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
                  <span className={`text-xs font-mono ${dayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dayNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayNet), true)}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {items.map((p, i) => (
                    <div key={`${p.recurring_item_id}-${i}`} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800">{p.name}</span>
                        {p.creditor && (
                          <span className="ml-2 text-xs text-gray-400">{p.creditor}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {FREQUENCY_LABEL[p.frequency] ?? p.frequency}
                      </span>
                      <span className={`text-sm font-mono shrink-0 ${p.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {p.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(p.amount), true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
