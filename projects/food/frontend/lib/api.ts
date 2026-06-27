import type {
  Recipe, RecipeWithIngredients, RecipeIngredient, MenuPlan, MenuPlanDetail,
  MenuPlanSlot, IngredientCategory, Ingredient, FamilyMember,
  ShoppingList, ShoppingListDetail, ShoppingListItem,
} from './types';

export interface WalmartProduct {
  itemId: string;
  name: string;
  price: number;
  imageUrl: string;
  url: string;
  availabilityStatus: string;
}

export interface WalmartCartResult {
  cartUrl: string;
  matched: { item: { id: number; name: string; quantity: number | null; unit: string | null }; product: WalmartProduct }[];
  unmatched: { id: number; name: string; quantity: number | null; unit: string | null }[];
}

export interface FeatureRequest {
  request_id: string;
  title: string;
  description: string | null;
  submitted_by: string | null;
  status: 'open' | 'in_progress' | 'done' | 'declined';
  github_issue_number: number | null;
  github_issue_status: string | null;
  github_issue_url: string | null;
  created_at: string;
  updated_at: string;
}

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
    update: (id: string, body: Partial<Ingredient>) => put<Ingredient>(`/ingredients/${id}`, body),
    categories: () => get<IngredientCategory[]>('/ingredient-categories'),
  },
  recipeIngredients: {
    add: (recipeId: string, body: { ingredient_id: string; quantity?: number | null; unit?: string | null; notes?: string | null }) =>
      post<RecipeIngredient>(`/recipes/${recipeId}/ingredients`, body),
    update: (recipeId: string, riId: number, body: { quantity?: number | null; unit?: string | null }) =>
      put<RecipeIngredient>(`/recipes/${recipeId}/ingredients/${riId}`, body),
    remove: (recipeId: string, riId: number) => del(`/recipes/${recipeId}/ingredients/${riId}`),
  },
  menuPlans: {
    list: () => get<MenuPlan[]>('/menu-plans'),
    create: (body: { name: string; week_start: string }) => post<MenuPlan>('/menu-plans', body),
    get: (id: string) => get<MenuPlanDetail>(`/menu-plans/${id}`),
    delete: (id: string) => del(`/menu-plans/${id}`),
    addSlot: (planId: string, slot: { day_of_week: number; meal_slot: string; recipe_id: string | null; servings_override?: number | null }) =>
      post<MenuPlanSlot>(`/menu-plans/${planId}/slots`, slot),
    updateSlot: (planId: string, slotId: number, body: { recipe_id: string | null; servings_override?: number | null; notes?: string | null }) =>
      put<MenuPlanSlot>(`/menu-plans/${planId}/slots/${slotId}`, body),
    removeSlot: (planId: string, slotId: number) => del(`/menu-plans/${planId}/slots/${slotId}`),
    suggest: (planId: string) => post<MenuPlanDetail>(`/menu-plans/${planId}/suggest`),
  },
  familyMembers: {
    list: () => get<FamilyMember[]>('/family-members'),
  },
  shoppingLists: {
    list: () => get<ShoppingList[]>('/shopping-lists'),
    get: (id: string) => get<ShoppingListDetail>(`/shopping-lists/${id}`),
    delete: (id: string) => del(`/shopping-lists/${id}`),
    updateStatus: (id: string, status: ShoppingList['status']) =>
      patch<ShoppingList>(`/shopping-lists/${id}`, { status }),
    fromPlan: (planId: string, servings: number, name?: string) =>
      post<ShoppingListDetail>(`/shopping-lists/from-plan/${planId}`, { servings, name }),
    addItem: (listId: string, body: { name: string; quantity?: number | null; unit?: string | null }) =>
      post<ShoppingListItem>(`/shopping-lists/${listId}/items`, body),
    checkItem: (itemId: number, checked: boolean) =>
      patch<ShoppingListItem>(`/shopping-list-items/${itemId}`, { checked }),
    deleteItem: (itemId: number) => del(`/shopping-list-items/${itemId}`),
  },
  walmart: {
    cartUrl: (listId: string) => post<WalmartCartResult>('/walmart/cart-url', { listId }),
  },
  featureRequests: {
    list:   () => get<FeatureRequest[]>('/feature-requests'),
    create: (body: { title: string; description?: string; submitted_by?: string }) =>
              post<FeatureRequest>('/feature-requests', body),
    update: (id: string, body: Partial<Pick<FeatureRequest, 'title' | 'description' | 'submitted_by' | 'status' | 'github_issue_number'>>) =>
              patch<FeatureRequest>(`/feature-requests/${id}`, body),
    delete: (id: string) => del(`/feature-requests/${id}`),
    sync:   () => post<{ synced: number; updated: number; imported: number }>('/feature-requests/sync', {}),
  },
};
