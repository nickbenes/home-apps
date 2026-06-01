-- Migration 001: initial schema
-- Food project — SQLite via better-sqlite3
-- All dates: ISO 8601 TEXT
-- Enable FK enforcement at connection time: PRAGMA foreign_keys = ON

-- ============================================================
-- INGREDIENT CATEGORIES
-- Defines store sections and pantry-staple classification.
-- Seeded inline since these are static reference data.
-- ============================================================
CREATE TABLE ingredient_categories (
  id            TEXT PRIMARY KEY,   -- e.g. 'produce', 'proteins', 'pantry'
  name          TEXT NOT NULL,
  store_section TEXT NOT NULL,      -- shopping list grouping header
  sort_order    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO ingredient_categories (id, name, store_section, sort_order) VALUES
  ('proteins', 'Proteins',             'Meat & Seafood',    10),
  ('produce',  'Produce',              'Produce',           20),
  ('grains',   'Grains & Pasta',       'Dry Goods',         30),
  ('bakery',   'Bread & Bakery',       'Bakery',            40),
  ('dairy',    'Dairy & Alternatives', 'Dairy',             50),
  ('pantry',   'Pantry & Sauces',      'Pantry',            60),
  ('spices',   'Spices & Seasonings',  'Pantry',            65),
  ('frozen',   'Frozen',               'Frozen',            70),
  ('other',    'Other',                'Other',             99);

-- ============================================================
-- INGREDIENTS
-- Master ingredient library. Shared across all recipes.
-- ============================================================
CREATE TABLE ingredients (
  id            TEXT PRIMARY KEY,  -- slug: 'ground_beef', 'olive_oil'
  name          TEXT NOT NULL,
  category_id   TEXT NOT NULL REFERENCES ingredient_categories(id),
  default_unit  TEXT,              -- 'lbs', 'cups', 'oz', 'each', 'bunch', etc.
  pantry_staple INTEGER NOT NULL DEFAULT 0,  -- 1 = "replenish if needed" on list
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX ingredients_name_idx ON ingredients(lower(name));

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE recipes (
  id           TEXT PRIMARY KEY,  -- slug + short timestamp suffix for uniqueness
  title        TEXT NOT NULL,
  servings     INTEGER NOT NULL DEFAULT 4,
  instructions TEXT,              -- markdown
  tags         TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  source_url   TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================
CREATE TABLE recipe_ingredients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity      REAL,
  unit          TEXT,
  notes         TEXT,   -- "optional", "to taste", "for garnish"
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- RECIPE VARIANTS
-- Per-night alternate options (e.g. "Turkey option" on Taco Night).
-- Each variant can swap or add ingredients relative to the base recipe.
-- ============================================================
CREATE TABLE recipe_variants (
  id        TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,  -- e.g. "Ground Turkey Option", "Bean-Only"
  notes     TEXT
);

CREATE TABLE recipe_variant_ingredients (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id             TEXT NOT NULL REFERENCES recipe_variants(id) ON DELETE CASCADE,
  ingredient_id          TEXT NOT NULL REFERENCES ingredients(id),
  quantity               REAL,
  unit                   TEXT,
  replaces_ingredient_id TEXT REFERENCES ingredients(id),  -- NULL = additive
  notes                  TEXT
);

-- ============================================================
-- FAMILY MEMBERS
-- Per-person dietary profiles. IDs are internal slugs, not full names.
-- dietary_flags: JSON array, e.g. ["dairy-free","vegetarian","plain-only","low-sugar"]
-- ============================================================
CREATE TABLE family_members (
  id            TEXT PRIMARY KEY,  -- internal slug: 'adult_1', 'kid_1', etc.
  display_name  TEXT NOT NULL,
  dietary_flags TEXT NOT NULL DEFAULT '[]',
  notes         TEXT
);

-- ============================================================
-- MENU PLANS
-- ============================================================
CREATE TABLE menu_plans (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  week_start TEXT NOT NULL,  -- ISO 8601 Monday date
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE menu_plan_slots (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_plan_id      TEXT NOT NULL REFERENCES menu_plans(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mon 6=Sun
  meal_slot         TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
  recipe_id         TEXT REFERENCES recipes(id),
  servings_override INTEGER,
  notes             TEXT
);

-- ============================================================
-- SHOPPING LISTS
-- ============================================================
CREATE TABLE shopping_lists (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  menu_plan_id TEXT REFERENCES menu_plans(id),  -- NULL = manually created
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','completed','archived'))
);

CREATE TABLE shopping_list_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  shopping_list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id    TEXT REFERENCES ingredients(id),  -- NULL for freeform items
  name             TEXT NOT NULL,   -- denormalized or freeform
  quantity         REAL,
  unit             TEXT,
  category_id      TEXT REFERENCES ingredient_categories(id),
  notes            TEXT,
  checked          INTEGER NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0
);
