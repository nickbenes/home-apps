import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api, Account } from '../lib/api';
import { formatCurrency, formatDate, STATUS_LABEL, STATUS_COLOR, STATUS_SORT, TYPE_LABEL } from '../lib/format';

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.accounts.list()
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99)
        );
        setAccounts(sorted);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!accounts.length) return <p className="text-gray-400 text-sm">Loading…</p>;

  const debts = accounts.filter(a => a.account_type !== 'income_source');
  const sources = accounts.filter(a => a.account_type === 'income_source');

  const totalDebt = debts
    .filter(a => !['paid_off', 'settled', 'charged_off'].includes(a.status))
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Accounts</h1>
        <span className="text-sm text-gray-500">
          Total active debt: <span className="font-mono text-red-600">{formatCurrency(totalDebt)}</span>
        </span>
      </div>

      <AccountTable title="Debt Accounts" accounts={debts} />
      {sources.length > 0 && <AccountTable title="Bank Accounts" accounts={sources} />}
    </div>
  );
}

function AccountTable({ title, accounts }: { title: string; accounts: Account[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Creditor</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Balance</th>
              <th className="px-4 py-2 text-left font-medium">As of</th>
              <th className="px-4 py-2 text-right font-medium">APR</th>
              <th className="px-4 py-2 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acct => (
              <tr key={acct.account_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  <div className="flex items-center gap-1.5">
                    {acct.creditor}
                    {acct.portal_url && (
                      <a href={acct.portal_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{TYPE_LABEL[acct.account_type] ?? acct.account_type}</td>
                <td className="px-4 py-2.5"><StatusBadge status={acct.status} /></td>
                <td className={`px-4 py-2.5 text-right font-mono ${acct.current_balance != null ? 'text-gray-900' : 'text-gray-300'}`}>
                  {acct.current_balance != null ? formatCurrency(acct.current_balance) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">
                  {acct.balance_date ? formatDate(acct.balance_date) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500">
                  {acct.interest_rate_pct != null ? `${acct.interest_rate_pct}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{acct.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
