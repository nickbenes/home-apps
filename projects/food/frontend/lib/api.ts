import type {
  Recipe, RecipeWithIngredients, MenuPlan, MenuPlanDetail,
  MenuPlanSlot, Ingredient, FamilyMember,
  ShoppingList, ShoppingListDetail, ShoppingListItem,
} from './types';

const BASE = '/food/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `POST ${path} → ${res.status}`);
  }
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `PUT ${path} → ${res.status}`);
  }
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `PATCH ${path} → ${res.status}`);
  }
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${path} → ${res.status}`);
}

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  return p.toString() ? `?${p}` : '';
}

export const api = {
  recipes: {
    list: (params?: { tags?: string; q?: string }) =>
      get<Recipe[]>(`/recipes${qs({ tags: params?.tags, q: params?.q })}`),
    get: (id: string) => get<RecipeWithIngredients>(`/recipes/${id}`),
    create: (body: Partial<Recipe> & { title: string }) => post<Recipe>('/recipes', body),
    update: (id: string, body: Partial<Recipe>) => put<Recipe>(`/recipes/${id}`, body),
    delete: (id: string) => del(`/recipes/${id}`),
    importUrl: (url: string) => post<Recipe>('/recipes/import-url', { url }),
  },
  ingredients: {
    list: (params?: { category?: string; q?: string }) =>
      get<Ingredient[]>(`/ingredients${qs({ category: params?.category, q: params?.q })}`),
  },
  menuPlans: {
    list: () => get<MenuPlan[]>('/menu-plans'),
    create: (body: { name: string; week_start: string }) => post<MenuPlan>('/menu-plans', body),
    get: (id: string) => get<MenuPlanDetail>(`/menu-plans/${id}`),
    delete: (id: string) => del(`/menu-plans/${id}`),
    setSlot: (planId: string, slot: { day_of_week: number; meal_slot: string; recipe_id: string | null }) =>
      put<MenuPlanSlot>(`/menu-plans/${planId}/slots`, slot),
    suggest: (planId: string) => post<MenuPlanDetail>(`/menu-plans/${planId}/suggest`),
  },
  familyMembers: {
    list: () => get<FamilyMember[]>('/family-members'),
  },
  shoppingLists: {
    list: () => get<ShoppingList[]>('/shopping-lists'),
    get: (id: string) => get<ShoppingListDetail>(`/shopping-lists/${id}`),
    delete: (id: string) => del(`/shopping-lists/${id}`),
    fromPlan: (planId: string, servings: number, name?: string) =>
      post<ShoppingListDetail>(`/shopping-lists/from-plan/${planId}`, { servings, name }),
    checkItem: (itemId: number, checked: boolean) =>
      patch<ShoppingListItem>(`/shopping-list-items/${itemId}`, { checked }),
  },
};
