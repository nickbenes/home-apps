import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Summary, RecurringItem } from '../lib/api';
import { formatCurrency } from '../lib/format';

function StatCard({ title, value, sub, linkTo, valueClass = '' }: {
  title: string;
  value: string;
  sub?: string;
  linkTo?: string;
  valueClass?: string;
}) {
  const body = (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return linkTo ? <Link to={linkTo} className="block hover:ring-2 hover:ring-blue-200 rounded-lg transition-shadow">{body}</Link> : body;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.summary(), api.recurring.list()])
      .then(([s, cf]) => { setSummary(s); setRecurring(cf); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!summary) return <p className="text-gray-400 text-sm">Loading…</p>;

  const monthlyIncome = recurring
    .filter(r => r.effective_monthly > 0)
    .reduce((sum, r) => sum + r.effective_monthly, 0);

  const monthlyExpenses = summary.monthly_recurring_by_category
    .reduce((sum, cat) => sum + cat.total_effective_monthly, 0);

  const net = monthlyIncome + monthlyExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Debt"
          value={formatCurrency(summary.total_debt ?? 0)}
          valueClass="text-red-600"
        />
        <StatCard
          title="Est. Monthly Expenses"
          value={formatCurrency(Math.abs(monthlyExpenses))}
          sub="from active recurring items"
          valueClass="text-amber-600"
        />
        <StatCard
          title="Unmatched Transactions"
          value={summary.unmatched_transaction_count.toLocaleString()}
          sub="need classification"
          linkTo="/transactions?unmatched=true"
          valueClass={summary.unmatched_transaction_count > 0 ? 'text-orange-600' : 'text-green-600'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Cashflow by category */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-700">Monthly Expenses by Category</h2>
            <p className="text-xs text-gray-400">from active recurring items</p>
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

        {/* Income / net summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-700">Monthly Income Sources</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {recurring.filter(r => r.effective_monthly > 0).map(r => (
                  <tr key={r.recurring_item_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 text-gray-700">{r.name}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">
                      {formatCurrency(r.effective_monthly)}
                    </td>
                  </tr>
                ))}
                {recurring.filter(r => r.effective_monthly > 0).length === 0 && (
                  <tr><td className="px-4 py-3 text-gray-400 italic" colSpan={2}>No income items</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Income</span>
              <span className="font-mono text-green-600">{formatCurrency(monthlyIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Expenses</span>
              <span className="font-mono text-red-600">−{formatCurrency(Math.abs(monthlyExpenses))}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-medium">
              <span className="text-gray-800">Net</span>
              <span className={`font-mono ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
