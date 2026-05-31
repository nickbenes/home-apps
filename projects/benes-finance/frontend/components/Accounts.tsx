import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, X, ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import { api, Account, RecurringItem } from '../lib/api';
import { formatCurrency, formatDate, STATUS_LABEL, STATUS_COLOR, STATUS_SORT, TYPE_LABEL } from '../lib/format';
import { downloadCsv } from '../lib/csv';

const STATUSES = Object.keys(STATUS_LABEL) as string[];

type SortKey = 'creditor' | 'account_type' | 'status' | 'current_balance' | 'interest_rate_pct' | 'monthly_payment';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ColHeader({ label, sortKey: key, current, dir, onSort, align = 'left' }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = current === key;
  const Icon = !isActive ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th
      onClick={() => onSort(key)}
      className={`px-4 py-2 font-medium cursor-pointer select-none hover:text-gray-700 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon size={11} className={isActive ? 'text-gray-600' : 'text-gray-300'} />
      </span>
    </th>
  );
}

function EditPanel({ acct, paymentItems, onSave, onCancel }: {
  acct: Account;
  paymentItems: RecurringItem[];
  onSave: (updated: Account) => void;
  onCancel: () => void;
}) {
  const [balance, setBalance]       = useState(acct.current_balance != null ? String(acct.current_balance) : '');
  const [balanceDate, setBalanceDate] = useState(acct.balance_date ?? '');
  const [apr, setApr]               = useState(acct.interest_rate_pct != null ? String(acct.interest_rate_pct) : '');
  const [status, setStatus]         = useState(acct.status);
  const [notes, setNotes]           = useState(acct.notes ?? '');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  // Payment: editable only when there's 0 or 1 monthly item linked to this account.
  // Multiple items or non-monthly frequency require editing via the Recurring page.
  const monthlyItems = paymentItems.filter(i => i.frequency === 'monthly');
  const canEditPayment = paymentItems.length === 0 || (paymentItems.length === 1 && monthlyItems.length === 1);
  const currentPaymentMonthly = Math.abs(paymentItems.reduce((s, i) => s + i.effective_monthly, 0));
  const [payment, setPayment] = useState(
    canEditPayment && currentPaymentMonthly > 0 ? String(currentPaymentMonthly.toFixed(2)) : ''
  );

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      const body: Parameters<typeof api.accounts.update>[1] = {
        status,
        notes: notes || null,
        interest_rate_pct: apr !== '' ? parseFloat(apr) : null,
      };
      if (balance !== '') body.current_balance = parseFloat(balance);
      if (balanceDate !== '') body.balance_date = balanceDate;
      const updated = await api.accounts.update(acct.account_id, body);

      if (canEditPayment && payment !== '') {
        const newMonthly = parseFloat(payment);
        if (newMonthly > 0) {
          if (monthlyItems.length === 1) {
            await api.recurring.update(monthlyItems[0].recurring_item_id, { amount: -newMonthly });
          } else {
            await api.recurring.create({
              name: `${acct.creditor} payment`,
              amount: -newMonthly,
              frequency: 'monthly',
              account_id: acct.account_id,
            });
          }
        }
      }

      onSave(updated);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-amber-50 border-t border-amber-100 px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Balance
          <input
            type="number" step="0.01"
            value={balance} onChange={e => setBalance(e.target.value)}
            placeholder="—"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          As of
          <input
            type="date"
            value={balanceDate} onChange={e => setBalanceDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          APR %
          <input
            type="number" step="0.1" min="0"
            value={apr} onChange={e => setApr(e.target.value)}
            placeholder="—"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-20 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Min Pmt/mo
          {canEditPayment ? (
            <input
              type="number" step="0.01" min="0"
              value={payment} onChange={e => setPayment(e.target.value)}
              placeholder="—"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-24 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          ) : (
            <span className="text-gray-400 italic">
              {formatCurrency(currentPaymentMonthly)} — edit via Recurring page
            </span>
          )}
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Status
          <select
            value={status} onChange={e => setStatus(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>

        <label className="text-xs text-gray-500 flex items-center gap-1.5 flex-1 min-w-40">
          Notes
          <input
            type="text"
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="—"
            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>

        <button
          onClick={handleSave} disabled={saving}
          className="bg-amber-600 text-white text-sm px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50 shrink-0"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.accounts.list(), api.recurring.list()])
      .then(([accts, items]) => { setAccounts(accts); setRecurringItems(items); })
      .catch(e => setError(e.message));
  }, []);

  // account_id → active outflow recurring items (amount < 0)
  const paymentMap = recurringItems
    .filter(i => i.amount < 0 && i.account_id != null)
    .reduce<Record<string, RecurringItem[]>>((m, i) => {
      const key = i.account_id!;
      m[key] = [...(m[key] ?? []), i];
      return m;
    }, {});

  function handleUpdate(updated: Account) {
    setAccounts(prev => prev.map(a => a.account_id === updated.account_id ? updated : a));
    api.recurring.list().then(setRecurringItems).catch(() => {});
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!accounts.length) return <p className="text-gray-400 text-sm">Loading…</p>;

  const debts   = accounts.filter(a => a.account_type !== 'income_source');
  const sources = accounts.filter(a => a.account_type === 'income_source');

  const totalDebt = debts
    .filter(a => !['paid_off', 'settled', 'charged_off'].includes(a.status))
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    const rows = accounts.map(a => {
      const monthly = Math.abs(
        (paymentMap[a.account_id] ?? []).reduce((s, i) => s + i.effective_monthly, 0)
      );
      return [
        a.creditor,
        TYPE_LABEL[a.account_type] ?? a.account_type,
        STATUS_LABEL[a.status] ?? a.status,
        a.current_balance?.toFixed(2) ?? '',
        a.balance_date ?? '',
        a.interest_rate_pct ?? '',
        monthly > 0 ? monthly.toFixed(2) : '',
        a.notes ?? '',
      ];
    });
    downloadCsv(
      `accounts-${date}.csv`,
      ['Creditor', 'Type', 'Status', 'Balance', 'Balance Date', 'APR %', 'Monthly Payment', 'Notes'],
      rows,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Accounts</h1>
        <span className="text-sm text-gray-500">
          Total active debt: <span className="font-mono text-red-600">{formatCurrency(totalDebt)}</span>
        </span>
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
        >
          <Download size={12} /> CSV
        </button>
      </div>
      <AccountTable title="Debt Accounts"  accounts={debts}   paymentMap={paymentMap} onUpdate={handleUpdate} />
      {sources.length > 0 && (
        <AccountTable title="Bank Accounts" accounts={sources} paymentMap={paymentMap} onUpdate={handleUpdate} />
      )}
    </div>
  );
}

function AccountTable({ title, accounts, paymentMap, onUpdate }: {
  title: string;
  accounts: Account[];
  paymentMap: Record<string, RecurringItem[]>;
  onUpdate: (updated: Account) => void;
}) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const effectiveMonthly = (a: Account) =>
    Math.abs((paymentMap[a.account_id] ?? []).reduce((s, i) => s + i.effective_monthly, 0));

  const sorted = [...accounts].sort((a, b) => {
    const d = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'creditor':          return d * a.creditor.localeCompare(b.creditor);
      case 'account_type':      return d * a.account_type.localeCompare(b.account_type);
      case 'status':            return d * ((STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99));
      case 'current_balance':   return d * ((a.current_balance ?? 0) - (b.current_balance ?? 0));
      case 'interest_rate_pct': {
        if (a.interest_rate_pct == null && b.interest_rate_pct == null) return 0;
        if (a.interest_rate_pct == null) return d;
        if (b.interest_rate_pct == null) return -d;
        return d * (a.interest_rate_pct - b.interest_rate_pct);
      }
      case 'monthly_payment':   return d * (effectiveMonthly(a) - effectiveMonthly(b));
      default: return 0;
    }
  });

  const colProps = { current: sortKey, dir: sortDir, onSort: handleSort };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <ColHeader label="Creditor"   sortKey="creditor"          {...colProps} />
              <ColHeader label="Type"       sortKey="account_type"      {...colProps} />
              <ColHeader label="Status"     sortKey="status"            {...colProps} />
              <ColHeader label="Balance"    sortKey="current_balance"   {...colProps} align="right" />
              <th className="px-4 py-2 text-left font-medium">As of</th>
              <ColHeader label="APR"        sortKey="interest_rate_pct" {...colProps} align="right" />
              <ColHeader label="Min Pmt/mo" sortKey="monthly_payment"   {...colProps} align="right" />
              <th className="px-4 py-2 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(acct => {
              const monthly = effectiveMonthly(acct);
              return (
                <React.Fragment key={acct.account_id}>
                  <tr
                    onClick={() => navigate(`/accounts/${acct.account_id}`)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        {acct.creditor}
                        {acct.portal_url && (
                          <a
                            href={acct.portal_url}
                            target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600"
                          >
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
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                      {acct.interest_rate_pct != null
                        ? `${acct.interest_rate_pct}%`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                      {monthly > 0 ? formatCurrency(monthly) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{acct.notes ?? ''}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
