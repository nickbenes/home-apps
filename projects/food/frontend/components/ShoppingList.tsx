import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Plus, Trash2, CheckCircle2, Circle, RefreshCw,
  CheckCheck, Archive, ChevronDown, ExternalLink, Loader2, Menu, X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { WalmartCartResult } from '../lib/api';
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
  return qty || unit ? `${qty}${qty && unit ? ' ' : ''}${unit}` : '';
}

function statusLabel(s: ShoppingList['status']) {
  return s === 'completed' ? 'Completed' : s === 'archived' ? 'Archived' : 'Active';
}

// ── Generate modal ────────────────────────────────────────────────────────────

function GenerateModal({
  plans, planId, servings, generating,
  onPlanChange, onServingsChange, onGenerate, onClose,
}: {
  plans: MenuPlan[]; planId: string; servings: number; generating: boolean;
  onPlanChange: (id: string) => void; onServingsChange: (n: number) => void;
  onGenerate: () => void; onClose: () => void;
}) {
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
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="block text-sm text-gray-700 mb-1">Servings (household size)</label>
        <input
          type="number" min={1} value={servings}
          onChange={e => onServingsChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onGenerate} disabled={!planId || generating}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {generating && <RefreshCw size={14} className="animate-spin" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Walmart cart modal ────────────────────────────────────────────────────────

function buildCartUrl(items: { itemId: string; quantity: number }[]): string {
  const param = items.map(i => `${i.itemId}:${i.quantity}`).join(',');
  return `https://affil.walmart.com/cart/addToCart?items=${param}`;
}

function WalmartCartModal({
  result, onClose,
}: {
  result: WalmartCartResult;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.matched.map(({ item }) => item.id))
  );

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedMatches = result.matched.filter(({ item }) => selected.has(item.id));
  const cartUrl = buildCartUrl(
    selectedMatches.map(({ item, product }) => ({
      itemId: product.itemId,
      quantity: Math.max(1, Math.ceil(item.quantity ?? 1)),
    }))
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Send to Walmart Cart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {result.matched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Matched — tap to deselect ({selected.size}/{result.matched.length})
              </p>
              <div className="space-y-2">
                {result.matched.map(({ item, product }) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 border-gray-200 opacity-50 hover:opacity-70'
                      }`}
                    >
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt="" className="w-10 h-10 object-contain shrink-0 rounded" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 truncate">{item.name}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className={`text-xs ${isSelected ? 'text-green-700' : 'text-gray-400'}`}>${product.price.toFixed(2)}</p>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-2"><polyline points="1,4 3.5,7 9,1" /></svg>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.unmatched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Not found on Walmart ({result.unmatched.length})
              </p>
              <div className="space-y-1">
                {result.unmatched.map(item => (
                  <p key={item.id} className="text-sm text-gray-500 px-2 py-1 bg-gray-50 rounded">
                    {item.name}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <a
            href={cartUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={selected.size === 0 ? e => e.preventDefault() : undefined}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              selected.size === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <ExternalLink size={14} /> Open in Walmart ({selected.size})
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Add item form ─────────────────────────────────────────────────────────────

function AddItemForm({ listId, onAdded }: { listId: string; onAdded: (item: ShoppingListItem) => void }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const item = await api.shoppingLists.addItem(listId, {
        name: name.trim(),
        quantity: qty.trim() === '' ? null : parseFloat(qty) || null,
        unit: unit.trim() || null,
      });
      onAdded(item);
      setName(''); setQty(''); setUnit('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center px-3 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
      <input
        type="number"
        value={qty}
        onChange={e => setQty(e.target.value)}
        placeholder="qty"
        className="w-14 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <input
        type="text"
        value={unit}
        onChange={e => setUnit(e.target.value)}
        placeholder="unit"
        className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Add item…"
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <button
        type="submit"
        disabled={adding || !name.trim()}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 shrink-0"
      >
        <Plus size={13} /> Add
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingListDetail | null>(null);
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPlanId, setGenPlanId] = useState('');
  const [genServings, setGenServings] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [sendingToWalmart, setSendingToWalmart] = useState(false);
  const [walmartResult, setWalmartResult] = useState<WalmartCartResult | null>(null);
  const [navOpen, setNavOpen] = useState(false);

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
    setNavOpen(false);
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

  async function deleteItem(item: ShoppingListItem) {
    await api.shoppingLists.deleteItem(item.id);
    setActiveList(prev => prev ? {
      ...prev,
      items: prev.items.filter(i => i.id !== item.id),
    } : null);
  }

  function handleItemAdded(item: ShoppingListItem) {
    setActiveList(prev => prev ? { ...prev, items: [...prev.items, item] } : null);
  }

  async function updateStatus(id: string, status: ShoppingList['status']) {
    const updated = await api.shoppingLists.updateStatus(id, status);
    setLists(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (activeList?.id === id) setActiveList(prev => prev ? { ...prev, status } : null);
    // If we moved out of active and filter is 'active', deselect
    if (status !== 'active' && statusFilter === 'active') setActiveList(null);
    return updated;
  }

  async function sendToWalmart() {
    if (!activeList) return;
    setSendingToWalmart(true);
    try {
      const result = await api.walmart.cartUrl(activeList.id);
      setWalmartResult(result);
    } catch (e: any) {
      alert(`Walmart error: ${e.message}`);
    } finally {
      setSendingToWalmart(false);
    }
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this shopping list?')) return;
    await api.shoppingLists.delete(id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (activeList?.id === id) setActiveList(null);
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>;

  const visibleLists = statusFilter === 'active'
    ? lists.filter(l => l.status === 'active')
    : lists;

  const sections = activeList ? groupBySection(activeList.items) : [];
  const checkedCount = activeList?.items.filter(i => i.checked).length ?? 0;
  const totalCount = activeList?.items.length ?? 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {showGenerate && (
        <GenerateModal
          plans={plans} planId={genPlanId} servings={genServings} generating={generating}
          onPlanChange={setGenPlanId} onServingsChange={setGenServings}
          onGenerate={generateList} onClose={() => setShowGenerate(false)}
        />
      )}
      {walmartResult && (
        <WalmartCartModal result={walmartResult} onClose={() => setWalmartResult(null)} />
      )}

      {/* Mobile header — opens the lists nav as a drawer */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
        <button onClick={() => setNavOpen(true)} className="text-gray-500 hover:text-gray-800">
          <Menu size={19} />
        </button>
        <span className="text-sm font-medium text-gray-700 truncate">
          {activeList ? activeList.name : 'Shopping Lists'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Mobile nav overlay */}
        {navOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Sidebar — desktop always visible, mobile slide-in drawer */}
        <div className={`fixed top-0 left-0 h-full w-56 z-30 border-r border-gray-200 bg-white flex flex-col overflow-hidden
          transform transition-transform lg:static lg:translate-x-0 lg:z-auto lg:shrink-0
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Shopping Lists</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowGenerate(true)}
                title="Generate from plan"
                className="text-green-600 hover:text-green-700 p-0.5 rounded"
              >
                <Plus size={17} />
              </button>
              <button
                onClick={() => setNavOpen(false)}
                className="lg:hidden text-gray-400 hover:text-gray-700 p-0.5 rounded"
              >
                <X size={17} />
              </button>
            </div>
          </div>

        {/* Status filter */}
        <div className="flex border-b border-gray-100 text-xs">
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 py-1.5 font-medium transition-colors ${
              statusFilter === 'active'
                ? 'text-green-700 border-b-2 border-green-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-1.5 font-medium transition-colors ${
              statusFilter === 'all'
                ? 'text-green-700 border-b-2 border-green-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleLists.length === 0 ? (
            <p className="p-4 text-xs text-gray-500">
              {statusFilter === 'active'
                ? 'No active lists. Click + to generate from a menu plan.'
                : 'No lists yet.'}
            </p>
          ) : (
            visibleLists.map(list => (
              <div
                key={list.id}
                onClick={() => loadList(list.id)}
                className={`flex items-start justify-between px-3 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  activeList?.id === list.id ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">{list.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {new Date(list.created_at).toLocaleDateString()}
                    </p>
                    {list.status !== 'active' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        list.status === 'completed'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {statusLabel(list.status)}
                      </span>
                    )}
                  </div>
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
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-lg font-semibold text-gray-900">{activeList.name}</h1>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={sendToWalmart}
                    disabled={sendingToWalmart || activeList.items.filter(i => !i.checked).length === 0}
                    title="Send unchecked items to Walmart cart"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-40"
                  >
                    {sendingToWalmart
                      ? <Loader2 size={13} className="animate-spin" />
                      : <ShoppingCart size={13} />
                    }
                    Walmart
                  </button>
                  {activeList.status === 'active' && (
                    <button
                      onClick={() => updateStatus(activeList.id, 'completed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <CheckCheck size={13} /> Mark Complete
                    </button>
                  )}
                  {activeList.status === 'completed' && (
                    <>
                      <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-lg">
                        Completed
                      </span>
                      <button
                        onClick={() => updateStatus(activeList.id, 'archived')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Archive size={13} /> Archive
                      </button>
                    </>
                  )}
                  {activeList.status === 'archived' && (
                    <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-lg">
                      Archived
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: totalCount ? `${(checkedCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0">{checkedCount} / {totalCount}</span>
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
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 group transition-colors"
                    >
                      <button onClick={() => toggleItem(item)} className="shrink-0">
                        {item.checked
                          ? <CheckCircle2 size={17} className="text-green-500" />
                          : <Circle size={17} className="text-gray-300" />
                        }
                      </button>
                      <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.name}
                      </span>
                      {formatQty(item) && (
                        <span className={`text-sm shrink-0 tabular-nums ${item.checked ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatQty(item)}
                        </span>
                      )}
                      <button
                        onClick={() => deleteItem(item)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity shrink-0"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add manual item */}
            {activeList.status === 'active' && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <AddItemForm listId={activeList.id} onAdded={handleItemAdded} />
              </div>
            )}
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
    </div>
  );
}
