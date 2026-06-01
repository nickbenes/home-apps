import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { ShoppingList, ShoppingListDetail, ShoppingListItem, MenuPlan } from '../lib/types';

function groupBySection(items: ShoppingListItem[]): [string, ShoppingListItem[]][] {
  const order: string[] = [];
  const map: Record<string, ShoppingListItem[]> = {};
  for (const item of items) {
    const section = item.store_section ?? 'Other';
    if (!map[section]) { map[section] = []; order.push(section); }
    map[section].push(item);
  }
  return order.map(s => [s, map[s]]);
}

function formatQty(item: ShoppingListItem): string {
  const qty = item.quantity != null ? String(item.quantity) : '';
  const unit = item.unit ?? '';
  return qty || unit ? `${qty}${qty && unit ? ' ' : ''}${unit}` : '';
}

interface GenerateModalProps {
  plans: MenuPlan[];
  planId: string;
  servings: number;
  generating: boolean;
  onPlanChange: (id: string) => void;
  onServingsChange: (n: number) => void;
  onGenerate: () => void;
  onClose: () => void;
}

function GenerateModal({
  plans, planId, servings, generating,
  onPlanChange, onServingsChange, onGenerate, onClose,
}: GenerateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Generate Shopping List</h2>

        <label className="block text-sm text-gray-700 mb-1">Menu Plan</label>
        <select
          value={planId}
          onChange={e => onPlanChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="block text-sm text-gray-700 mb-1">
          Servings (household size)
        </label>
        <input
          type="number"
          min={1}
          value={servings}
          onChange={e => onServingsChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onGenerate}
            disabled={!planId || generating}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating && <RefreshCw size={14} className="animate-spin" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShoppingListPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingListDetail | null>(null);
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlanId, setGenPlanId] = useState('');
  const [genServings, setGenServings] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.shoppingLists.list(), api.menuPlans.list()]).then(([ls, ps]) => {
      setLists(ls);
      setPlans(ps);
      if (ps.length > 0) setGenPlanId(ps[0].id);
      setLoading(false);
    });
  }, []);

  async function loadList(id: string) {
    const detail = await api.shoppingLists.get(id);
    setActiveList(detail);
  }

  async function generateList() {
    if (!genPlanId) return;
    setGenerating(true);
    try {
      const result = await api.shoppingLists.fromPlan(genPlanId, genServings);
      setLists(prev => [result, ...prev]);
      setActiveList(result);
      setShowGenerate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleItem(item: ShoppingListItem) {
    const updated = await api.shoppingLists.checkItem(item.id, !item.checked);
    setActiveList(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === updated.id ? { ...i, checked: updated.checked } : i),
    } : null);
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this shopping list?')) return;
    await api.shoppingLists.delete(id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (activeList?.id === id) setActiveList(null);
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>;

  const sections = activeList ? groupBySection(activeList.items) : [];
  const checkedCount = activeList?.items.filter(i => i.checked).length ?? 0;
  const totalCount = activeList?.items.length ?? 0;

  return (
    <div className="flex h-full min-h-0">
      {showGenerate && (
        <GenerateModal
          plans={plans}
          planId={genPlanId}
          servings={genServings}
          generating={generating}
          onPlanChange={setGenPlanId}
          onServingsChange={setGenServings}
          onGenerate={generateList}
          onClose={() => setShowGenerate(false)}
        />
      )}

      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Shopping Lists</span>
          <button
            onClick={() => setShowGenerate(true)}
            title="Generate from plan"
            className="text-green-600 hover:text-green-700 p-0.5 rounded"
          >
            <Plus size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {lists.length === 0 ? (
            <p className="p-4 text-xs text-gray-500">No lists yet. Click + to generate from a menu plan.</p>
          ) : (
            lists.map(list => (
              <div
                key={list.id}
                onClick={() => loadList(list.id)}
                className={`flex items-start justify-between px-3 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  activeList?.id === list.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">{list.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(list.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                  className="ml-2 mt-0.5 text-gray-300 hover:text-red-400 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {activeList ? (
          <div className="max-w-lg">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-lg font-semibold text-gray-900 mb-1">{activeList.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {checkedCount} / {totalCount}
                </span>
              </div>
            </div>

            {/* Items by section */}
            {sections.map(([section, items]) => (
              <div key={section} className="mb-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                  {section}
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      {item.checked
                        ? <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                        : <Circle size={17} className="text-gray-300 shrink-0" />
                      }
                      <span className={`text-sm flex-1 ${
                        item.checked ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}>
                        {item.name}
                      </span>
                      {formatQty(item) && (
                        <span className={`text-sm shrink-0 tabular-nums ${
                          item.checked ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {formatQty(item)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <ShoppingCart size={40} className="opacity-25" />
            <p className="text-sm">Select a list or click + to generate from a menu plan</p>
            {plans.length > 0 && (
              <button
                onClick={() => setShowGenerate(true)}
                className="mt-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Generate Shopping List
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
