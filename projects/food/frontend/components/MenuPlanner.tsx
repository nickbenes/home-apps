import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Plus, Trash2, ChevronDown, Users } from 'lucide-react';
import { api } from '../lib/api';
import type { MenuPlan, MenuPlanDetail, MenuPlanSlot, Recipe } from '../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

function scaleLabel(householdSize: number, recipeServings: number | null): string {
  if (!recipeServings) return '';
  const factor = householdSize / recipeServings;
  if (Math.abs(factor - 1) < 0.05) return '';
  return `×${factor.toFixed(1)}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_SLOTS = ['dinner', 'lunch', 'breakfast', 'snack'] as const;
const MEAL_LABELS: Record<string, string> = {
  dinner: '🍽 Dinner',
  lunch: '🥗 Lunch',
  breakfast: '☀️ Breakfast',
  snack: '🍎 Snack',
};

type MealSlot = typeof MEAL_SLOTS[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function NewPlanModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (plan: MenuPlan) => void;
}) {
  const [name, setName] = useState(`Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  const [weekStart, setWeekStart] = useState(getMondayOfWeek());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const plan = await api.menuPlans.create({ name: name.trim(), week_start: weekStart });
      onCreate(plan);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">New Week Plan</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week starting (Monday)</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MenuPlanner() {
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planDetail, setPlanDetail] = useState<MenuPlanDetail | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [dragRecipeId, setDragRecipeId] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState(7);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');
  const dragRecipeIdRef = useRef<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────

  const loadPlanDetail = useCallback(async (id: string) => {
    try {
      const detail = await api.menuPlans.get(id);
      setPlanDetail(detail);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    Promise.all([api.menuPlans.list(), api.recipes.list()]).then(([p, r]) => {
      setPlans(p);
      setRecipes(r);
      if (p.length > 0) {
        setActivePlanId(p[0].id);
      }
    }).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (activePlanId) loadPlanDetail(activePlanId);
    else setPlanDetail(null);
  }, [activePlanId, loadPlanDetail]);

  // ── Slot helpers ────────────────────────────────────────────────────────

  function getSlot(day: number, meal: MealSlot): MenuPlanSlot | undefined {
    return planDetail?.slots.find(s => s.day_of_week === day && s.meal_slot === meal);
  }

  async function assignSlot(day: number, meal: MealSlot, recipeId: string | null) {
    if (!activePlanId) return;
    try {
      await api.menuPlans.setSlot(activePlanId, { day_of_week: day, meal_slot: meal, recipe_id: recipeId });
      await loadPlanDetail(activePlanId);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSuggest() {
    if (!activePlanId) return;
    setSuggesting(true);
    setError('');
    try {
      const updated = await api.menuPlans.suggest(activePlanId);
      setPlanDetail(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleDeletePlan() {
    if (!activePlanId || !window.confirm('Delete this week plan?')) return;
    try {
      await api.menuPlans.delete(activePlanId);
      const updated = plans.filter(p => p.id !== activePlanId);
      setPlans(updated);
      setActivePlanId(updated[0]?.id ?? null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────

  function handleDragStart(recipeId: string) {
    setDragRecipeId(recipeId);
    dragRecipeIdRef.current = recipeId;
  }

  function handleDragEnd() {
    setDragRecipeId(null);
    dragRecipeIdRef.current = null;
    setHoveredSlot(null);
  }

  function handleDrop(day: number, meal: MealSlot) {
    const id = dragRecipeIdRef.current;
    setHoveredSlot(null);
    if (id && activePlanId) assignSlot(day, meal, id);
  }

  // ── Filtered recipe list ─────────────────────────────────────────────────

  const filteredRecipes = recipeSearch.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
    : recipes;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 max-w-full">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900 mr-1">Menu Planner</h1>

        {/* Plan selector */}
        {plans.length > 0 && (
          <div className="relative">
            <select
              value={activePlanId ?? ''}
              onChange={e => setActivePlanId(e.target.value || null)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatWeekLabel(p.week_start)}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Actions */}
        <button
          onClick={() => setShowNewPlan(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Plus size={14} /> New Plan
        </button>

        {activePlanId && (
          <>
            <button
              onClick={handleSuggest}
              disabled={suggesting || recipes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {suggesting ? 'Suggesting…' : 'Suggest Dinners'}
            </button>
            <button
              onClick={handleDeletePlan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded-md"
            >
              <Trash2 size={14} /> Delete Plan
            </button>
          </>
        )}

        {/* Household size */}
        <div className="flex items-center gap-1.5 ml-auto text-sm text-gray-600">
          <Users size={14} />
          <span>Household:</span>
          <button onClick={() => setHouseholdSize(n => Math.max(1, n - 1))}
            className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600 leading-none">−</button>
          <span className="w-5 text-center font-medium">{householdSize}</span>
          <button onClick={() => setHouseholdSize(n => n + 1)}
            className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600 leading-none">+</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {plans.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-4">No week plans yet.</p>
          <button
            onClick={() => setShowNewPlan(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Plus size={15} /> Create your first plan
          </button>
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {planDetail && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[700px]">
            <thead>
              <tr>
                <th className="w-24 text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Meal
                </th>
                {DAYS.map(d => (
                  <th key={d} className="text-center py-2 px-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_SLOTS.map(meal => (
                <tr key={meal} className={meal === 'dinner' ? '' : 'opacity-80'}>
                  <td className="py-1 pr-3 text-xs text-gray-500 whitespace-nowrap align-top pt-2">
                    {MEAL_LABELS[meal]}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const slot = getSlot(dayIdx, meal);
                    const key = `${dayIdx}-${meal}`;
                    const isHovered = hoveredSlot === key && dragRecipeId != null;
                    return (
                      <td key={dayIdx} className="p-0.5 align-top">
                        <div
                          className={`min-h-14 p-1.5 rounded-md border text-xs transition-all
                            ${isHovered
                              ? 'bg-green-50 border-green-400 shadow-sm'
                              : slot?.recipe_id
                                ? 'bg-white border-gray-200 shadow-sm'
                                : 'border-dashed border-gray-200 bg-gray-50/50'
                            }
                          `}
                          onDragOver={e => { e.preventDefault(); setHoveredSlot(key); }}
                          onDragLeave={e => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              setHoveredSlot(null);
                            }
                          }}
                          onDrop={() => handleDrop(dayIdx, meal)}
                        >
                          {slot?.recipe_id ? (
                            <div className="flex flex-col h-full">
                              <div className="flex items-start gap-0.5">
                                <span className="flex-1 font-medium text-gray-800 leading-tight line-clamp-2">
                                  {slot.recipe_title}
                                </span>
                                <button
                                  onClick={() => assignSlot(dayIdx, meal, null)}
                                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors ml-0.5"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                              {slot.recipe_servings && (
                                <span className="text-gray-400 mt-0.5">
                                  {scaleLabel(householdSize, slot.recipe_servings) && (
                                    <span className="text-green-600 font-medium">
                                      {scaleLabel(householdSize, slot.recipe_servings)}
                                    </span>
                                  )}
                                  {' '}serves {slot.recipe_servings}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className={`h-full flex items-center justify-center text-gray-300
                              ${isHovered ? 'text-green-400' : ''}`}>
                              {isHovered ? '↓ Drop' : '+'}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recipe library (drag source) ─────────────────────────────────── */}
      {planDetail && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recipe Library</h2>
            <span className="text-xs text-gray-400">— drag to assign a meal slot</span>
            <input
              type="search"
              placeholder="Search…"
              value={recipeSearch}
              onChange={e => setRecipeSearch(e.target.value)}
              className="ml-auto w-40 border border-gray-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {recipes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No recipes yet.{' '}
              <a href="/food/recipes" className="text-green-600 underline">Add some recipes</a> to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isDragging={dragRecipeId === recipe.id}
                  onDragStart={() => handleDragStart(recipe.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {filteredRecipes.length === 0 && (
                <p className="text-sm text-gray-400">No recipes match "{recipeSearch}"</p>
              )}
            </div>
          )}
        </div>
      )}

      {showNewPlan && (
        <NewPlanModal
          onClose={() => setShowNewPlan(false)}
          onCreate={plan => {
            setPlans(prev => [plan, ...prev]);
            setActivePlanId(plan.id);
            setShowNewPlan(false);
          }}
        />
      )}
    </div>
  );
}

// ── Recipe card (drag source) ─────────────────────────────────────────────────

function RecipeCard({
  recipe,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  recipe: Recipe;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const tags = parseTags(recipe.tags);

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab active:cursor-grabbing select-none
        border rounded-lg px-3 py-2 bg-white text-sm transition-all
        ${isDragging
          ? 'opacity-50 border-green-400 ring-1 ring-green-300'
          : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
        }`}
    >
      <div className="font-medium text-gray-800">{recipe.title}</div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.slice(0, 3).map(tag => (
            <span key={tag}
              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
