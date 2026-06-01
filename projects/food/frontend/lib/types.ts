export interface Recipe {
  id: string;
  title: string;
  servings: number;
  instructions: string | null;
  tags: string; // JSON string
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name: string;
  category_id: string;
  category_name: string;
  store_section: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  sort_order: number;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
  variants: unknown[];
}

export interface MenuPlan {
  id: string;
  name: string;
  week_start: string; // ISO date YYYY-MM-DD
  created_at: string;
}

export interface MenuPlanSlot {
  id: number;
  menu_plan_id: string;
  day_of_week: number; // 0=Mon … 6=Sun
  meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string | null;
  recipe_title: string | null;
  recipe_servings: number | null;
  servings_override: number | null;
  notes: string | null;
}

export interface MenuPlanDetail extends MenuPlan {
  slots: MenuPlanSlot[];
}

export interface Ingredient {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  store_section: string;
  default_unit: string | null;
  pantry_staple: number;
}

export interface FamilyMember {
  id: string;
  display_name: string;
  dietary_flags: string; // JSON string
  notes: string | null;
}
