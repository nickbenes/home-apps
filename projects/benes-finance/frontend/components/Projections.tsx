import React, { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { api, DebtPriorityItem } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface ScheduleRow {
  month: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

function buildSchedule(
  balance: number,
  ratePct: number | null,
  monthlyPayment: number,
): ScheduleRow[] {
  if (balance <= 0 || monthlyPayment <= 0) return [];
  const r = ratePct != null ? ratePct / 100 / 12 : 0;
  if (r > 0 && monthlyPayment <= balance * r) return []; // payment can't cover interest

  const rows: ScheduleRow[] = [];
  let bal = balance;
  const now = new Date();

  while (bal > 0.005 && rows.length < 600) {
    const m = rows.length + 1;
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const interest  = r > 0 ? bal * r : 0;
    const payment   = Math.min(monthlyPayment, bal + interest); // don't overpay on last month
    const principal = payment - interest;
    bal = Math.max(0, bal - principal);
    rows.push({ month: m, date: dateStr, payment, interest, principal, balance: bal });
  }

  return rows;
}

function formatYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function BalanceChart({ initialBalance, schedule }: { initialBalance: number; schedule: ScheduleRow[] }) {
  if (!schedule.length) return null;
  const W = 1000, H = 80, PX = 4, PY = 6;
  const pts = [{ balance: initialBalance }, ...schedule];
  const cx = (i: number) => PX + (i / (pts.length - 1)) * (W - 2 * PX);
  const cy = (b: number) => PY + (1 - b / initialBalance) * (H - 2 * PY);

  const line     = pts.map((p, i) => `${cx(i).toFixed(1)},${cy(p.balance).toFixed(1)}`).join(' ');
  const zeroY    = cy(0).toFixed(1);
  const fillPath = `M ${cx(0).toFixed(1)},${zeroY} L ${line} L ${cx(pts.length - 1).toFixed(1)},${zeroY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <path d={fillPath} fill="rgba(59,130,246,0.08)" />
      <polyline points={line} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function AccountRow({ item }: { item: DebtPriorityItem }) {
  const [expanded, setExpanded] = useState(false);

  const schedule = useMemo(
    () => expanded ? buildSchedule(item.current_balance, item.interest_rate_pct, item.monthly_payment ?? 0) : [],
    [expanded, item.current_balance, item.interest_rate_pct, item.monthly_payment],
  );

  const noPayment   = (item.monthly_payment ?? 0) === 0;
  const rateMonthly = item.interest_rate_pct != null ? item.interest_rate_pct / 100 / 12 : 0;
  const paymentTooLow = !noPayment && rateMonthly > 0 &&
    (item.monthly_payment ?? 0) <= item.current_balance * rateMonthly;
  const noPayoff = noPayment || paymentTooLow;

  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPaid     = schedule.reduce((s, r) => s + r.payment,  0);
  const payoffDate    = schedule.at(-1)?.date ?? null;

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className={`border-b cursor-pointer transition-colors ${
          expanded ? 'bg-blue-50 border-blue-100 hover:bg-blue-100' : 'border-gray-50 hover:bg-gray-50'
        }`}
      >
        <td className="px-3 py-3 text-gray-300">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
        <td className="px-4 py-3 font-medium text-gray-900">{item.creditor}</td>
        <td className="px-4 py-3 text-right font-mono text-gray-900">{formatCurrency(item.current_balance)}</td>
        <td className="px-4 py-3 text-right font-mono text-gray-700">
          {item.interest_rate_pct != null
            ? `${item.interest_rate_pct.toFixed(1)}%`
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-right font-mono text-gray-700">
          {item.monthly_payment
            ? formatCurrency(item.monthly_payment)
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-right text-gray-500">
          {noPayoff
            ? <span className="flex items-center justify-end gap-1 text-red-500 text-xs"><AlertTriangle size={11} />no payoff</span>
            : item.months_to_payoff != null ? `${Math.ceil(item.months_to_payoff)} mo` : '—'}
        </td>
        <td className="px-4 py-3 text-right text-gray-700">
          {item.payoff_date_est
            ? <span title="Manually set estimate">{item.payoff_date_est}</span>
            : item.payoff_date ? formatYM(item.payoff_date) : <span className="text-gray-300">—</span>}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-blue-100">
          <td colSpan={7} className="bg-blue-50 px-6 py-4">
            {noPayoff ? (
              <p className="text-sm text-red-600">
                {noPayment
                  ? 'No monthly payment linked — add one via the Accounts or Recurring page.'
                  : 'Monthly payment is too low to cover monthly interest. Balance will grow indefinitely.'}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Summary stats */}
                <div className="flex flex-wrap gap-6 text-xs text-gray-600">
                  <span>Months: <strong className="text-gray-900">{schedule.length}</strong></span>
                  <span>Payoff: <strong className="text-gray-900">{payoffDate ? formatYM(payoffDate) : '—'}</strong></span>
                  <span>Total interest: <strong className="font-mono text-red-600">{formatCurrency(totalInterest)}</strong></span>
                  <span>Total paid: <strong className="font-mono text-gray-900">{formatCurrency(totalPaid)}</strong></span>
                  <span className="text-gray-400">
                    Interest is {totalPaid > 0 ? `${((totalInterest / totalPaid) * 100).toFixed(0)}%` : '—'} of total payments
                  </span>
                </div>

                {/* Balance chart */}
                <div className="bg-white rounded border border-blue-100 px-3 pt-2 pb-1">
                  <p className="text-xs text-gray-400 mb-1">Balance over time</p>
                  <BalanceChart initialBalance={item.current_balance} schedule={schedule} />
                </div>

                {/* Month-by-month table */}
                <div className="max-h-60 overflow-y-auto rounded border border-blue-100 bg-white">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                      <tr className="text-gray-400 uppercase tracking-wide">
                        <th className="px-3 py-1.5 text-right font-medium">#</th>
                        <th className="px-3 py-1.5 text-left  font-medium">Date</th>
                        <th className="px-3 py-1.5 text-right font-medium">Payment</th>
                        <th className="px-3 py-1.5 text-right font-medium">Interest</th>
                        <th className="px-3 py-1.5 text-right font-medium">Principal</th>
                        <th className="px-3 py-1.5 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map(row => (
                        <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-right font-mono text-gray-400">{row.month}</td>
                          <td className="px-3 py-1.5 text-gray-700">{formatYM(row.date)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-gray-700 tabular-nums">{formatCurrency(row.payment)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-red-500  tabular-nums">{formatCurrency(row.interest)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-green-700 tabular-nums">{formatCurrency(row.principal)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-gray-900 tabular-nums">{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Projections() {
  const [items, setItems]   = useState<DebtPriorityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.debtPriority()
      .then(data => { setItems(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (error)   return <p className="text-red-600 text-sm">{error}</p>;
  if (!items.length) return <p className="text-gray-400 text-sm">No active debt accounts found.</p>;

  const totalDebt    = items.reduce((s, i) => s + i.current_balance, 0);
  const latestPayoff = items.map(i => i.payoff_date).filter(Boolean).sort().at(-1);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Payoff Projections</h1>
        <span className="text-xs text-gray-400">Click any account to see month-by-month amortization</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Total Active Debt</p>
          <p className="text-xl font-mono font-semibold text-gray-900 mt-0.5">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Debt-Free Date (last to pay off)</p>
          <p className="text-xl font-mono font-semibold text-gray-900 mt-0.5">
            {latestPayoff ? formatYM(latestPayoff) : '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 w-6" />
                <th className="px-4 py-2 text-left  font-medium">Creditor</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">APR</th>
                <th className="px-4 py-2 text-right font-medium">Monthly Pmt</th>
                <th className="px-4 py-2 text-right font-medium">Months Left</th>
                <th className="px-4 py-2 text-right font-medium">Payoff Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => <AccountRow key={item.account_id} item={item} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
