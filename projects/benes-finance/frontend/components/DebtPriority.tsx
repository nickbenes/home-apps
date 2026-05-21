import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { api, DebtPriorityItem } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { downloadCsv } from '../lib/csv';

type Mode = 'avalanche' | 'snowball';

function sorted(items: DebtPriorityItem[], mode: Mode): DebtPriorityItem[] {
  return [...items].sort((a, b) => {
    if (mode === 'avalanche') {
      // High APR first; nulls last
      if (a.interest_rate_pct == null && b.interest_rate_pct == null) return 0;
      if (a.interest_rate_pct == null) return 1;
      if (b.interest_rate_pct == null) return -1;
      return b.interest_rate_pct - a.interest_rate_pct;
    } else {
      // Lowest balance first
      return a.current_balance - b.current_balance;
    }
  });
}

function formatPayoffDate(d: string | null): string {
  if (!d) return '—';
  const [y, m] = d.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function aprColor(rate: number): string {
  if (rate >= 100) return 'text-red-700 font-semibold';
  if (rate >= 30)  return 'text-orange-600 font-semibold';
  return 'text-gray-900';
}

export default function DebtPriority() {
  const [items, setItems] = useState<DebtPriorityItem[]>([]);
  const [mode, setMode] = useState<Mode>('avalanche');
  const [error, setError] = useState('');

  useEffect(() => {
    api.debtPriority().then(setItems).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!items.length) return <p className="text-gray-400 text-sm">Loading…</p>;

  const display = sorted(items, mode);
  const missingApr = items.filter(i => i.interest_rate_pct == null).length;

  const totalBalance  = items.reduce((s, i) => s + i.current_balance, 0);
  const totalPayment  = items.reduce((s, i) => s + (i.monthly_payment ?? 0), 0);
  const totalInterest = items.reduce((s, i) => s + (i.monthly_interest ?? 0), 0);

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `debt-summary-${date}.csv`,
      ['Rank', 'Creditor', 'Type', 'Balance', 'APR %', 'Monthly Payment', 'Monthly Interest', 'Payoff ETA', 'Deadline'],
      [
        ...sorted(items, mode).map((item, i) => [
          i + 1,
          item.creditor,
          item.account_type.replace(/_/g, ' '),
          item.current_balance.toFixed(2),
          item.interest_rate_pct ?? '',
          item.monthly_payment?.toFixed(2) ?? '',
          item.monthly_interest?.toFixed(2) ?? '',
          item.payoff_date ?? '',
          item.payoff_date_est ?? '',
        ]),
        [],
        ['', 'TOTAL', '', totalBalance.toFixed(2), '', totalPayment.toFixed(2), totalInterest.toFixed(2), '', ''],
      ],
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Debt Priority</h1>
        <div className="flex rounded border border-gray-200 overflow-hidden text-sm">
          {(['avalanche', 'snowball'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 capitalize ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {mode === 'avalanche' ? 'Highest APR first — minimizes total interest paid' : 'Lowest balance first — fastest wins'}
        </span>
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
        >
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Debt',         value: formatCurrency(totalBalance) },
          { label: 'Monthly Payments',   value: formatCurrency(totalPayment) },
          { label: 'Monthly Interest',   value: formatCurrency(totalInterest) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-mono font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {missingApr > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <AlertTriangle size={14} />
          {missingApr} account{missingApr > 1 ? 's' : ''} missing APR — avalanche ranking is incomplete. Update via Accounts page.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Creditor</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
                <th className="px-4 py-2 text-right font-medium">APR</th>
                <th className="px-4 py-2 text-right font-medium">Monthly Pmt</th>
                <th className="px-4 py-2 text-right font-medium">Monthly Interest</th>
                <th className="px-4 py-2 text-right font-medium">Payoff ETA</th>
              </tr>
            </thead>
            <tbody>
              {display.map((item, i) => (
                <tr key={item.account_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.creditor}</td>
                  <td className="px-4 py-2.5 text-gray-500 capitalize">{item.account_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">{formatCurrency(item.current_balance)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {item.interest_rate_pct != null
                      ? <span className={aprColor(item.interest_rate_pct)}>{item.interest_rate_pct.toFixed(1)}%</span>
                      : <span className="text-gray-300 flex items-center justify-end gap-1"><AlertTriangle size={12} />—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                    {item.monthly_payment ? formatCurrency(item.monthly_payment) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">
                    {item.monthly_interest != null ? formatCurrency(item.monthly_interest) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">
                    {item.payoff_date_est
                      ? <span title="Manually set estimate">{item.payoff_date_est}</span>
                      : formatPayoffDate(item.payoff_date)
                    }
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
