import React, { useEffect, useState, useCallback } from 'react';
import { api, AuditEntry } from '../lib/api';
import { formatCurrency } from '../lib/format';

const ACTION_STYLES: Record<string, string> = {
  created: 'bg-green-50 text-green-700 border-green-200',
  updated: 'bg-blue-50  text-blue-700  border-blue-200',
  deleted: 'bg-red-50   text-red-600   border-red-200',
};

const SOURCE_STYLES: Record<string, string> = {
  user:   'bg-purple-50 text-purple-700',
  rule:   'bg-amber-50  text-amber-700',
  import: 'bg-gray-100  text-gray-600',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Change({ entry }: { entry: AuditEntry }) {
  if (entry.action === 'created') {
    return (
      <span className="text-xs text-gray-700">
        → <strong>{entry.budget_item_name ?? entry.budget_item_id}</strong>
        {entry.new_allocated_amount != null && (
          <span className="text-gray-500"> ({formatCurrency(Math.abs(entry.new_allocated_amount))})</span>
        )}
      </span>
    );
  }
  if (entry.action === 'deleted') {
    return (
      <span className="text-xs text-gray-500 line-through">
        {entry.budget_item_name ?? entry.budget_item_id}
        {entry.old_allocated_amount != null && (
          <span> ({formatCurrency(Math.abs(entry.old_allocated_amount))})</span>
        )}
      </span>
    );
  }
  // updated
  return (
    <span className="text-xs text-gray-700">
      <span className="text-gray-400 line-through mr-1">{entry.old_budget_item_name ?? entry.old_budget_item_id ?? '?'}</span>
      → <strong>{entry.budget_item_name ?? entry.budget_item_id}</strong>
    </span>
  );
}

export default function AuditLog() {
  const [entries, setEntries]     = useState<AuditEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterAction, setFilterAction]     = useState('');
  const [filterSource, setFilterSource]     = useState('');
  const [offset, setOffset]       = useState(0);
  const PAGE = 100;

  const load = useCallback(() => {
    setLoading(true);
    api.audit.list({
      action:     filterAction || undefined,
      changed_by: filterSource || undefined,
      limit: PAGE,
      offset,
    })
      .then(data => { setEntries(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [filterAction, filterSource, offset]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 when filters change
  function applyFilter(action: string, source: string) {
    setFilterAction(action);
    setFilterSource(source);
    setOffset(0);
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Classification Audit Trail</h1>
        <span className="text-xs text-gray-400">Every change to transaction budget item assignments</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          Action:
          {['', 'created', 'updated', 'deleted'].map(v => (
            <button
              key={v}
              onClick={() => applyFilter(v, filterSource)}
              className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                filterAction === v
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {v || 'all'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          Source:
          {['', 'user', 'rule', 'import'].map(v => (
            <button
              key={v}
              onClick={() => applyFilter(filterAction, v)}
              className={`px-2 py-0.5 rounded border text-xs transition-colors ${
                filterSource === v
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {v || 'all'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {loading ? 'Loading…' : `${entries.length} entries`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!loading && entries.length === 0 ? (
          <p className="text-gray-400 text-sm px-4 py-8 text-center">No audit entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left  font-medium">When</th>
                  <th className="px-4 py-2 text-left  font-medium">Transaction</th>
                  <th className="px-4 py-2 text-left  font-medium">Action</th>
                  <th className="px-4 py-2 text-left  font-medium">Change</th>
                  <th className="px-4 py-2 text-left  font-medium">Source</th>
                  <th className="px-4 py-2 text-left  font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.log_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap" title={entry.created_at}>
                      {relativeTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-gray-900 truncate text-xs font-medium">
                        {entry.merchant_normalized || entry.merchant_text || entry.transaction_id}
                      </p>
                      {entry.transaction_date && (
                        <p className="text-gray-400 text-xs">
                          {entry.transaction_date}
                          {entry.transaction_amount != null && (
                            <span className={`ml-2 font-mono ${entry.transaction_amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {formatCurrency(Math.abs(entry.transaction_amount))}
                            </span>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded border text-xs font-medium ${ACTION_STYLES[entry.action] ?? ''}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Change entry={entry} />
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.changed_by && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${SOURCE_STYLES[entry.changed_by] ?? ''}`}>
                          {entry.changed_by}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {entry.category_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(offset > 0 || entries.length === PAGE) && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setOffset(o => Math.max(0, o - PAGE))}
            disabled={offset === 0}
            className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400 self-center">Page {Math.floor(offset / PAGE) + 1}</span>
          <button
            onClick={() => setOffset(o => o + PAGE)}
            disabled={entries.length < PAGE}
            className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
