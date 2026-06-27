-- Migration 005: allow multiple recipes per (plan, day, meal slot)
-- Drops the UNIQUE(menu_plan_id, day_of_week, meal_slot) constraint added in
-- migration 002. That constraint enforced exactly one recipe per meal; slots
-- are now added/removed/edited individually by id instead of upserted by
-- (day, meal). SQLite requires table recreation to drop a constraint.

CREATE TABLE menu_plan_slots_new (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_plan_id      TEXT NOT NULL REFERENCES menu_plans(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_slot         TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
  recipe_id         TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  servings_override INTEGER,
  notes             TEXT
);

INSERT INTO menu_plan_slots_new SELECT * FROM menu_plan_slots;
DROP TABLE menu_plan_slots;
ALTER TABLE menu_plan_slots_new RENAME TO menu_plan_slots;
