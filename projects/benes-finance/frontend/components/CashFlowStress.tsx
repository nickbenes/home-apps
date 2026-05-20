import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
import { api, ScheduledPayment } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface WeekBucket {
  weekStart: string;
  weekEnd: string;
  income: number;
  outflow: number;
  net: number;
  balance: number;
  isStress: boolean;
  payments: ScheduledPayment[];
}

function mondayOf(d: Date): Date {
  const day = d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return m;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeeks(payments: ScheduledPayment[], startBalance: number, numWeeks: number): WeekBucket[] {
  const monday = mondayOf(new Date());
  const weeks: WeekBucket[] = Array.from({ length: numWeeks }, (_, i) => {
    const ws = new Date(monday);
    ws.setDate(monday.getDate() + i * 7);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    return { weekStart: isoDate(ws), weekEnd: isoDate(we), income: 0, outflow: 0, net: 0, balance: 0, isStress: false, payments: [] };
  });

  for (const p of payments) {
    const idx = weeks.findIndex(w => p.due_date >= w.weekStart && p.due_date <= w.weekEnd);
    if (idx >= 0) {
      if (p.amount > 0) weeks[idx].income += p.amount;
      else weeks[idx].outflow += Math.abs(p.amount);
      weeks[idx].payments.push(p);
    }
  }

  let balance = startBalance;
  for (const w of weeks) {
    w.net = w.income - w.outflow;
    balance += w.net;
    w.balance = balance;
    w.isStress = balance < 0;
  }
  return weeks;
}

function BalanceChart({ weeks }: { weeks: WeekBucket[] }) {
  if (weeks.length < 2) return null;
  const W = 1000, H = 100, PX = 6, PY = 8;
  const balances = weeks.map(w => w.balance);
  const minBal = Math.min(0, ...balances);
  const maxBal = Math.max(0, ...balances, 1);
  const range = maxBal - minBal;

  const cx = (i: number) => PX + (i / (weeks.length - 1)) * (W - 2 * PX);
  const cy = (b: number) => PY + (1 - (b - minBal) / range) * (H - 2 * PY);
  const zeroY = cy(0);

  const line = weeks.map((w, i) => `${cx(i).toFixed(1)},${cy(w.balance).toFixed(1)}`).join(' ');
  const stress = weeks.some(w => w.balance < 0)
    ? `M ${cx(0).toFixed(1)},${zeroY.toFixed(1)} L ${
        weeks.map((w, i) => `${cx(i).toFixed(1)},${Math.max(cy(w.balance), zeroY).toFixed(1)}`).join(' L ')
      } L ${cx(weeks.length - 1).toFixed(1)},${zeroY.toFixed(1)} Z`
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      {stress && <path d={stress} fill="rgba(239,68,68,0.15)" />}
      <line x1={PX} y1={zeroY} x2={W - PX} y2={zeroY} stroke="#ef4444" strokeDasharray="6,3" strokeWidth={1.5} />
      <polyline points={line} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function formatWeekRange(start: string, end: string): string {
  // Append T12:00:00 to avoid timezone shifts that could move the date back a day
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs w-20 text-right tabular-nums">
        {value > 0 ? formatCurrency(value) : <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

export default function CashFlowStress() {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startBalance, setStartBalance] = useState('0');
  const [numWeeks, setNumWeeks] = useState(13);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  useEffect(() => {
    api.scheduled.list(182)
      .then(data => { setPayments(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;

  const startBal = parseFloat(startBalance) || 0;
  const weeks = buildWeeks(payments, startBal, numWeeks);
  const stressCount  = weeks.filter(w => w.isStress).length;
  const totalIncome  = weeks.reduce((s, w) => s + w.income,  0);
  const totalOutflow = weeks.reduce((s, w) => s + w.outflow, 0);
  const maxIncome    = Math.max(...weeks.map(w => w.income),  1);
  const maxOutflow   = Math.max(...weeks.map(w => w.outflow), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Cash Flow Stress</h1>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 flex items-center gap-1.5">
            Starting balance
            <input
              type="number" step="100"
              value={startBalance} onChange={e => setStartBalance(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <div className="flex rounded border border-gray-200 overflow-hidden text-sm">
            {([13, 26] as const).map(n => (
              <button
                key={n} onClick={() => setNumWeeks(n)}
                className={`px-3 py-1 ${numWeeks === n ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {n}w
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Total Inflow ({numWeeks}w)</p>
          <p className="text-xl font-mono font-semibold text-green-700 mt-0.5">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Total Outflow ({numWeeks}w)</p>
          <p className="text-xl font-mono font-semibold text-red-600 mt-0.5">{formatCurrency(totalOutflow)}</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${stressCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500">Stress Weeks</p>
          <p className={`text-xl font-mono font-semibold mt-0.5 ${stressCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            {stressCount > 0 ? `${stressCount} of ${numWeeks}` : 'None ✓'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 mb-2">Projected balance — red zone = negative</p>
        <BalanceChart weeks={weeks} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 w-6"></th>
                <th className="px-4 py-2 text-left font-medium">Week</th>
                <th className="px-4 py-2 text-right font-medium">Income</th>
                <th className="px-4 py-2 text-right font-medium">Outflow</th>
                <th className="px-4 py-2 text-right font-medium">Net</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map(w => {
                const isExpanded = expandedWeek === w.weekStart;
                const stress = w.isStress;
                return (
                  <React.Fragment key={w.weekStart}>
                    <tr
                      onClick={() => setExpandedWeek(isExpanded ? null : w.weekStart)}
                      className={`border-b cursor-pointer transition-colors ${
                        stress ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'border-gray-50 hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-gray-300">
                        {w.payments.length > 0
                          ? isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
                          : null}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {stress && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                          {formatWeekRange(w.weekStart, w.weekEnd)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Bar value={w.income}  max={maxIncome}  color="bg-green-500" /></td>
                      <td className="px-4 py-2.5"><Bar value={w.outflow} max={maxOutflow} color="bg-red-400"   /></td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${w.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {w.net >= 0 ? '+' : ''}{formatCurrency(w.net)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-medium tabular-nums ${w.balance < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                        {formatCurrency(w.balance)}
                      </td>
                    </tr>
                    {isExpanded && w.payments.length > 0 && (
                      <tr className={`border-b ${stress ? 'border-red-100' : 'border-gray-50'}`}>
                        <td colSpan={6} className={`px-8 py-2 ${stress ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <div className="flex flex-wrap gap-x-6 gap-y-1">
                            {[...w.payments].sort((a, b) => a.amount - b.amount).map((p, i) => (
                              <span key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.amount > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                                {p.name}
                                <span className={`font-mono tabular-nums ${p.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                  {p.amount > 0 ? '+' : ''}{formatCurrency(p.amount)}
                                </span>
                                <span className="text-gray-400">{p.due_date}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
