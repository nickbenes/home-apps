import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Pencil, Check, X, Trash2, Plus, ChevronDown,
} from 'lucide-react';
import { api } from '../lib/api';
import type { RecipeWithIngredients, RecipeIngredient, IngredientCategory, Ingredient } from '../lib/types';

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

// ── Category badge with inline select ────────────────────────────────────────

function CategoryBadge({
  ingredient,
  categories,
  onChange,
}: {
  ingredient: RecipeIngredient;
  categories: IngredientCategory[];
  onChange: (ingredientId: string, newCategoryId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isOther = ingredient.category_id === 'other';

  async function pick(catId: string) {
    if (catId === ingredient.category_id) { setOpen(false); return; }
    setSaving(true);
    await onChange(ingredient.ingredient_id, catId);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
          isOther
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400'
            : 'border-gray-200 bg-gray-100 text-gray-600 hover:border-gray-300'
        }`}
        title={isOther ? 'Tap to fix category' : 'Change category'}
      >
        {saving ? '…' : ingredient.category_name}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] py-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => pick(cat.id)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                cat.id === ingredient.category_id ? 'font-semibold text-green-700' : 'text-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ingredient row ────────────────────────────────────────────────────────────

function IngredientRow({
  item,
  categories,
  onCategoryChange,
  onRemove,
  onUpdate,
}: {
  item: RecipeIngredient;
  categories: IngredientCategory[];
  onCategoryChange: (ingredientId: string, catId: string) => Promise<void>;
  onRemove: (riId: number) => Promise<void>;
  onUpdate: (riId: number, qty: number | null, unit: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity != null ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const parsedQty = qty.trim() === '' ? null : parseFloat(qty) || null;
    await onUpdate(item.id, parsedQty, unit.trim() || null);
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setQty(item.quantity != null ? String(item.quantity) : '');
    setUnit(item.unit ?? '');
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 group border-b border-gray-100 last:border-0">
      {editing ? (
        <>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="qty"
            className="w-16 text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <input
            type="text"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="unit"
            className="w-20 text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <span className="text-sm text-gray-800 flex-1">{item.ingredient_name}</span>
          <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700 p-0.5">
            <Check size={15} />
          </button>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X size={15} />
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-500 w-12 text-right shrink-0 tabular-nums">
            {item.quantity != null ? item.quantity : ''}
          </span>
          <span className="text-sm text-gray-400 w-14 shrink-0">{item.unit ?? ''}</span>
          <span className="text-sm text-gray-800 flex-1">{item.ingredient_name}</span>
          <CategoryBadge
            ingredient={item}
            categories={categories}
            onChange={onCategoryChange}
          />
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 p-0.5 transition-opacity"
            title="Edit quantity/unit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-0.5 transition-opacity"
            title="Remove ingredient"
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

// ── Add ingredient row ────────────────────────────────────────────────────────

function AddIngredientRow({
  allIngredients,
  categories,
  onAdd,
}: {
  allIngredients: Ingredient[];
  categories: IngredientCategory[];
  onAdd: (ingredientId: string, qty: number | null, unit: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matches = query.trim().length > 0
    ? allIngredients.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];
  const createOption = query.trim().length >= 2 &&
    !allIngredients.some(i => i.name.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    function close(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowDropdown(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function handleAdd() {
    if (!selected && !query.trim()) return;
    setAdding(true);
    try {
      let ingredientId = selected?.id ?? '';
      if (!ingredientId && query.trim()) {
        const created = await api.ingredients.update('_new_', {}) as unknown;
        // Create new ingredient in 'other' category
        const res = await fetch('/food/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: query.trim(), category_id: 'other' }),
        });
        const newIng = await res.json() as Ingredient;
        ingredientId = newIng.id;
      }
      const parsedQty = qty.trim() === '' ? null : parseFloat(qty) || null;
      await onAdd(ingredientId, parsedQty, unit.trim() || null);
      setQuery('');
      setQty('');
      setUnit('');
      setSelected(null);
    } finally {
      setAdding(false);
    }
  }

  function pickIngredient(ing: Ingredient) {
    setSelected(ing);
    setQuery(ing.name);
    setUnit(ing.default_unit ?? '');
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.blur(), 0);
  }

  async function createAndPick() {
    const res = await fetch('/food/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: query.trim(), category_id: 'other' }),
    });
    const newIng = await res.json() as Ingredient;
    setSelected(newIng);
    setShowDropdown(false);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-b-lg border-t border-gray-200">
      <input
        type="number"
        value={qty}
        onChange={e => setQty(e.target.value)}
        placeholder="qty"
        className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <input
        type="text"
        value={unit}
        onChange={e => setUnit(e.target.value)}
        placeholder="unit"
        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); setShowDropdown(true); }}
          onFocus={() => { if (query.trim()) setShowDropdown(true); }}
          placeholder="Search or add ingredient…"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
        />
        {showDropdown && (matches.length > 0 || createOption) && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
          >
            {matches.map(ing => (
              <button
                key={ing.id}
                onMouseDown={e => { e.preventDefault(); pickIngredient(ing); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="text-gray-800">{ing.name}</span>
                <span className="text-xs text-gray-400">{ing.category_name}</span>
              </button>
            ))}
            {createOption && (
              <button
                onMouseDown={e => { e.preventDefault(); createAndPick(); }}
                className="w-full text-left px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 font-medium"
              >
                + Create "{query.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={adding || (!selected && !query.trim())}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 shrink-0"
      >
        <Plus size={13} />
        Add
      </button>
    </div>
  );
}

// ── Recipe detail ─────────────────────────────────────────────────────────────

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingMeta, setEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editServings, setEditServings] = useState(4);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.recipes.get(id),
      api.ingredients.categories(),
      api.ingredients.list(),
    ]).then(([r, cats, ings]) => {
      setRecipe(r);
      setCategories(cats);
      setAllIngredients(ings);
      setEditTitle(r.title);
      setEditServings(r.servings);
      setEditNotes(r.notes ?? '');
      setEditTags(parseTags(r.tags).join(', '));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function saveMeta() {
    if (!recipe) return;
    setSavingMeta(true);
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const updated = await api.recipes.update(recipe.id, {
      title: editTitle.trim() || recipe.title,
      servings: editServings,
      notes: editNotes.trim() || null,
      tags,
    });
    setRecipe(prev => prev ? { ...prev, ...updated } : null);
    setSavingMeta(false);
    setEditingMeta(false);
  }

  async function updateIngredientCategory(ingredientId: string, catId: string) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    await api.ingredients.update(ingredientId, { category_id: catId });
    setRecipe(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.map(i =>
        i.ingredient_id === ingredientId
          ? { ...i, category_id: catId, category_name: cat.name, store_section: cat.store_section }
          : i
      ),
    } : null);
    // Keep allIngredients in sync so the add-row dropdown shows updated categories
    setAllIngredients(prev => prev.map(i =>
      i.id === ingredientId
        ? { ...i, category_id: catId, category_name: cat.name, store_section: cat.store_section }
        : i
    ));
  }

  async function removeIngredient(riId: number) {
    if (!recipe) return;
    await api.recipeIngredients.remove(recipe.id, riId);
    setRecipe(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== riId),
    } : null);
  }

  async function updateIngredient(riId: number, qty: number | null, unit: string | null) {
    if (!recipe) return;
    const updated = await api.recipeIngredients.update(recipe.id, riId, { quantity: qty, unit });
    setRecipe(prev => prev ? {
      ...prev,
      ingredients: prev.ingredients.map(i =>
        i.id === riId ? { ...i, quantity: updated.quantity, unit: updated.unit } : i
      ),
    } : null);
  }

  async function addIngredient(ingredientId: string, qty: number | null, unit: string | null) {
    if (!recipe) return;
    const newRi = await api.recipeIngredients.add(recipe.id, { ingredient_id: ingredientId, quantity: qty, unit });
    // Re-fetch to get denormalized fields (ingredient_name, category_name, etc.)
    const fresh = await api.recipes.get(recipe.id);
    setRecipe(prev => prev ? { ...prev, ingredients: fresh.ingredients } : null);
    // Also add any newly-created ingredient to allIngredients
    const ing = fresh.ingredients.find(i => i.id === newRi.id);
    if (ing && !allIngredients.some(a => a.id === ing.ingredient_id)) {
      setAllIngredients(prev => [...prev, {
        id: ing.ingredient_id, name: ing.ingredient_name,
        category_id: ing.category_id, category_name: ing.category_name,
        store_section: ing.store_section, default_unit: ing.unit, pantry_staple: 0,
      }]);
    }
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>;
  if (!recipe) return <div className="p-6 text-red-500 text-sm">Recipe not found.</div>;

  const tags = parseTags(recipe.tags);
  const otherCount = recipe.ingredients.filter(i => i.category_id === 'other').length;

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate('/recipes')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={15} /> Recipes
      </button>

      {/* Header */}
      <div className="mb-6">
        {editingMeta ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-xl font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-600 shrink-0">Serves</label>
              <input
                type="number"
                min={1}
                value={editServings}
                onChange={e => setEditServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <label className="text-sm text-gray-600 shrink-0 ml-2">Tags</label>
              <input
                type="text"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="quick, vegetarian, …"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Notes…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingMeta(false)}
                className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 flex-1 leading-snug">
                {recipe.title}
              </h1>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-green-600"
                    title="View original recipe"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button
                  onClick={() => setEditingMeta(true)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Edit recipe"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm text-gray-500">Serves {recipe.servings}</span>
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            {recipe.notes && (
              <p className="mt-2 text-sm text-gray-600">{recipe.notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Uncategorized warning */}
      {otherCount > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="font-medium">{otherCount} ingredient{otherCount > 1 ? 's' : ''}</span>
          {' '}need{otherCount === 1 ? 's' : ''} a category — tap the amber badge to fix.
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Ingredients
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg">
          {recipe.ingredients.length === 0 && (
            <p className="px-3 py-3 text-sm text-gray-400">No ingredients yet.</p>
          )}
          {recipe.ingredients.map(ing => (
            <IngredientRow
              key={ing.id}
              item={ing}
              categories={categories}
              onCategoryChange={updateIngredientCategory}
              onRemove={removeIngredient}
              onUpdate={updateIngredient}
            />
          ))}
          <AddIngredientRow
            allIngredients={allIngredients}
            categories={categories}
            onAdd={addIngredient}
          />
        </div>
      </div>

      {/* Instructions */}
      {recipe.instructions && (
        <div className="mb-6">
          <button
            onClick={() => setShowInstructions(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 hover:text-gray-900"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showInstructions ? '' : '-rotate-90'}`}
            />
            Instructions
          </button>
          {showInstructions && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
