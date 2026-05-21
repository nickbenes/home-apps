import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, Download } from 'lucide-react';
import { api, Transaction, Account, BudgetItem, Mapping } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';

const PAGE_SIZE = 50;

// Budget items grouped by category for the classify dropdown
function BudgetItemSelect({ items, value, onChange }: {
  items: BudgetItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  const byCategory = items.reduce<Record<string, BudgetItem[]>>((acc, item) => {
    (acc[item.category_name] ??= []).push(item);
    return acc;
  }, {});

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      <option value="">— select budget item —</option>
      {Object.entries(byCategory).map(([cat, catItems]) => (
        <optgroup key={cat} label={cat}>
          {catItems.map(item => (
            <option key={item.budget_item_id} value={item.budget_item_id}>{item.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// Inline expand panel for classification
function ClassifyPanel({ tx, budgetItems, onDone }: {
  tx: Transaction & { mappings?: Mapping[] };
  budgetItems: BudgetItem[];
  onDone: () => void;
}) {
  const [mappings, setMappings] = useState<Mapping[]>(tx.mappings ?? []);
  const [selectedItem, setSelectedItem] = useState('');
  const [amount, setAmount] = useState(tx.amount.toFixed(2));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    // Load full detail (with mappings) on first open
    if (!tx.mappings) {
      api.transactions.get(tx.transaction_id).then(d => setMappings(d.mappings));
    }
  }, [tx.transaction_id]);

  async function handleClassify() {
    if (!selectedItem) { setErr('Select a budget item'); return; }
    setSaving(true); setErr('');
    try {
      const mapping = await api.transactions.classify(tx.transaction_id, {
        budget_item_id: selectedItem,
        allocated_amount: parseFloat(amount),
      });
      setMappings(prev => [...prev, mapping]);
      setSelectedItem(''); setAmount(tx.amount.toFixed(2));
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(mappingId: string) {
    try {
      await api.mappings.delete(mappingId);
      setMappings(prev => prev.filter(m => m.mapping_id !== mappingId));
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="bg-blue-50 border-t border-blue-100 px-4 py-3">
      {mappings.length > 0 && (
        <div className="mb-3 space-y-1">
          {mappings.map(m => (
            <div key={m.mapping_id} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle size={13} className="text-green-500 shrink-0" />
              <span>{m.budget_item_name ?? m.budget_item_id}</span>
              <span className="text-gray-400">({m.category_name})</span>
              <span className="font-mono ml-auto">{formatCurrency(m.allocated_amount, true)}</span>
              <button onClick={() => handleDelete(m.mapping_id)} className="text-gray-400 hover:text-red-500 ml-1">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <BudgetItemSelect items={budgetItems} value={selectedItem} onChange={setSelectedItem} />
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={handleClassify}
          disabled={saving}
          className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Classify'}
        </button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </div>
    </div>
  );
}

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL params
  const q = searchParams.get('q') ?? '';
  const accountId = searchParams.get('account_id') ?? '';
  const unmatched = searchParams.get('unmatched') === 'true';

  function setFilter(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
    setOffset(0);
  }

  const loadTransactions = useCallback((reset: boolean) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    api.transactions.list({
      q: q || undefined,
      account_id: accountId || undefined,
      unmatched: unmatched || undefined,
      limit: PAGE_SIZE + 1,
      offset: currentOffset,
    }).then(rows => {
      setHasMore(rows.length > PAGE_SIZE);
      const page = rows.slice(0, PAGE_SIZE);
      setTransactions(prev => reset ? page : [...prev, ...page]);
      if (reset) setOffset(0);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, accountId, unmatched, offset]);

  // Reload when filters change
  useEffect(() => { loadTransactions(true); }, [q, accountId, unmatched]);

  // Load metadata once
  useEffect(() => {
    api.accounts.list().then(setAccounts);
    api.budget.items().then(setBudgetItems);
  }, []);

  function loadMore() {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    setLoading(true);
    api.transactions.list({
      q: q || undefined, account_id: accountId || undefined, unmatched: unmatched || undefined,
      limit: PAGE_SIZE + 1, offset: next,
    }).then(rows => {
      setHasMore(rows.length > PAGE_SIZE);
      setTransactions(prev => [...prev, ...rows.slice(0, PAGE_SIZE)]);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  // After classify, refresh the specific row's mapping_count
  function handleClassifyDone() {
    setTransactions(prev => prev.map(tx =>
      tx.transaction_id === expandedId
        ? { ...tx, mapping_count: tx.mapping_count + 1 }
        : tx
    ));
    if (unmatched) {
      // Remove classified tx from unmatched view
      setTransactions(prev => prev.filter(tx => tx.transaction_id !== expandedId));
      setExpandedId(null);
    }
  }

  async function handleExport() {
    const all = await api.transactions.list({
      q: q || undefined,
      account_id: accountId || undefined,
      unmatched: unmatched || undefined,
      limit: 5000,
      offset: 0,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `transactions-${date}.csv`,
      ['Date', 'Merchant', 'Merchant (raw)', 'Amount', 'Account', 'Matched', 'Transaction ID'],
      all.map(tx => [
        tx.transaction_date,
        tx.merchant_normalized ?? tx.merchant_text,
        tx.merchant_text,
        tx.amount.toFixed(2),
        tx.account_id,
        tx.mapping_count > 0 ? 'Yes' : 'No',
        tx.transaction_id,
      ]),
    );
  }

  const debitSources = accounts.filter(a => a.account_type === 'income_source');

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search merchant…"
          value={q}
          onChange={e => setFilter('q', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <select
          value={accountId}
          onChange={e => setFilter('account_id', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">All accounts</option>
          {debitSources.map(a => (
            <option key={a.account_id} value={a.account_id}>{a.creditor}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unmatched}
            onChange={e => setFilter('unmatched', e.target.checked ? 'true' : '')}
            className="rounded border-gray-300"
          />
          Unmatched only
        </label>
        <span className="text-xs text-gray-400 ml-auto">{transactions.length} transactions</span>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
        >
          <Download size={12} /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium w-20">Date</th>
              <th className="px-4 py-2 text-left font-medium">Merchant</th>
              <th className="px-4 py-2 text-right font-medium w-24">Amount</th>
              <th className="px-4 py-2 text-left font-medium w-28">Account</th>
              <th className="px-4 py-2 text-center font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const isExpanded = expandedId === tx.transaction_id;
              const isMatched = tx.mapping_count > 0;
              const merchantDisplay = tx.merchant_normalized ?? tx.merchant_text;

              return (
                <React.Fragment key={tx.transaction_id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : tx.transaction_id)}
                    className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 max-w-xs truncate" title={tx.merchant_text}>
                      {merchantDisplay}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(tx.amount), true)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{tx.account_id}</td>
                    <td className="px-4 py-2.5 text-center">
                      {isMatched
                        ? <CheckCircle size={14} className="text-green-500 mx-auto" />
                        : <Circle size={14} className="text-gray-300 mx-auto" />}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-blue-100">
                      <td colSpan={5} className="p-0">
                        <ClassifyPanel
                          tx={tx}
                          budgetItems={budgetItems}
                          onDone={handleClassifyDone}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!loading && transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-3 text-center text-gray-400 text-sm border-t border-gray-100">
            Loading…
          </div>
        )}

        {hasMore && !loading && (
          <div className="px-4 py-3 text-center border-t border-gray-100">
            <button onClick={loadMore} className="text-sm text-blue-600 hover:underline">
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
