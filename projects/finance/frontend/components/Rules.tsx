import React, { useEffect, useState } from 'react';
import { Trash2, Play, Plus, CheckCircle } from 'lucide-react';
import { api, ClassificationRule, BudgetItem } from '../lib/api';

const MATCH_FIELDS  = ['merchant_normalized', 'merchant_text'] as const;
const MATCH_TYPES   = ['contains', 'starts_with', 'exact'] as const;
const CONFIDENCES   = ['auto_high', 'auto_medium', 'auto_low'] as const;
const CONF_LABEL: Record<string, string> = {
  auto_high: 'High', auto_medium: 'Medium', auto_low: 'Low',
};
const CONF_COLOR: Record<string, string> = {
  auto_high: 'text-green-700 bg-green-50', auto_medium: 'text-amber-700 bg-amber-50', auto_low: 'text-gray-600 bg-gray-100',
};

const EMPTY_FORM = {
  pattern: '', match_field: 'merchant_normalized' as const, match_type: 'contains' as const,
  budget_item_id: '', confidence: 'auto_high' as const, priority: 0, notes: '',
};

export default function Rules() {
  const [rules, setRules]         = useState<ClassificationRule[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [adding, setAdding]       = useState(false);
  const [addErr, setAddErr]       = useState('');
  const [applying, setApplying]   = useState(false);
  const [applyResult, setApplyResult] = useState<{ classified: number; skipped: number } | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([api.rules.list(), api.budget.items()])
      .then(([r, b]) => { setRules(r); setBudgetItems(b); })
      .catch(e => setError(e.message));
  }, []);

  function setF<K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleAdd() {
    if (!form.pattern.trim() || !form.budget_item_id) {
      setAddErr('Pattern and budget item are required.'); return;
    }
    setAdding(true); setAddErr('');
    try {
      const created = await api.rules.create({
        ...form,
        is_active: 1,
        notes: form.notes || null,
      } as any);
      setRules(prev => [created, ...prev].sort((a, b) => b.priority - a.priority));
      setForm(EMPTY_FORM);
    } catch (e: any) {
      setAddErr(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(rule: ClassificationRule) {
    const updated = await api.rules.update(rule.rule_id, { is_active: rule.is_active ? 0 : 1 });
    setRules(prev => prev.map(r => r.rule_id === updated.rule_id ? updated : r));
  }

  async function handleDelete(id: string) {
    await api.rules.delete(id);
    setRules(prev => prev.filter(r => r.rule_id !== id));
  }

  async function handleApply() {
    setApplying(true); setApplyResult(null);
    try {
      const result = await api.rules.apply();
      setApplyResult(result);
    } finally {
      setApplying(false);
    }
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const byCategory = budgetItems.reduce<Record<string, BudgetItem[]>>((m, bi) => {
    (m[bi.category_name] ??= []).push(bi); return m;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Classification Rules</h1>
        <span className="text-xs text-gray-400">
          Merchant text patterns → budget items — applied to unclassified transactions
        </span>
        <div className="ml-auto flex items-center gap-3">
          {applyResult && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              <CheckCircle size={12} />
              {applyResult.classified} classified, {applyResult.skipped} unmatched
            </span>
          )}
          <button
            onClick={handleApply} disabled={applying}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Play size={13} />
            {applying ? 'Applying…' : 'Apply Rules'}
          </button>
        </div>
      </div>

      {/* Add rule form */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-xs font-medium text-gray-600 mb-3">Add Rule</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Pattern
            <input
              type="text" value={form.pattern} onChange={e => setF('pattern', e.target.value)}
              placeholder="e.g. walmart"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>

          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Field
            <select value={form.match_field} onChange={e => setF('match_field', e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {MATCH_FIELDS.map(f => (
                <option key={f} value={f}>{f === 'merchant_normalized' ? 'normalized name' : 'raw text'}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Match
            <select value={form.match_type} onChange={e => setF('match_type', e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {MATCH_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Budget Item
            <select value={form.budget_item_id} onChange={e => setF('budget_item_id', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-48">
              <option value="">— select —</option>
              {Object.entries(byCategory).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(bi => <option key={bi.budget_item_id} value={bi.budget_item_id}>{bi.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Confidence
            <select value={form.confidence} onChange={e => setF('confidence', e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {CONFIDENCES.map(c => <option key={c} value={c}>{CONF_LABEL[c]}</option>)}
            </select>
          </label>

          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Priority
            <input type="number" value={form.priority} onChange={e => setF('priority', parseInt(e.target.value) || 0)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-16 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-transparent">.</span>
            <button onClick={handleAdd} disabled={adding}
              className="flex items-center gap-1.5 bg-gray-800 text-white text-sm px-3 py-1 rounded hover:bg-gray-900 disabled:opacity-50">
              <Plus size={13} /> {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
        {addErr && <p className="text-red-600 text-xs mt-2">{addErr}</p>}
      </div>

      {/* Rules table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {rules.length === 0 ? (
          <p className="text-gray-400 text-sm px-4 py-6 text-center">
            No rules yet. Add one above, then click Apply Rules to classify transactions.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Pattern</th>
                  <th className="px-4 py-2 text-left font-medium">Field / Match</th>
                  <th className="px-4 py-2 text-left font-medium">Budget Item</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">Confidence</th>
                  <th className="px-4 py-2 text-right font-medium">Priority</th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.rule_id}
                    className={`border-b border-gray-50 ${rule.is_active ? '' : 'opacity-40'}`}>
                    <td className="px-4 py-2.5 font-mono text-gray-900">{rule.pattern}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {rule.match_field === 'merchant_normalized' ? 'normalized' : 'raw'} / {rule.match_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">{rule.budget_item_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{rule.category_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${CONF_COLOR[rule.confidence]}`}>
                        {CONF_LABEL[rule.confidence]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">{rule.priority}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 capitalize">{rule.source.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? 'Disable' : 'Enable'}
                          className={`w-8 h-4 rounded-full transition-colors ${rule.is_active ? 'bg-blue-500' : 'bg-gray-200'}`}
                        >
                          <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${rule.is_active ? 'translate-x-4' : ''}`} />
                        </button>
                        <button onClick={() => handleDelete(rule.rule_id)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
