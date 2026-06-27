import { Router } from 'express';
import { randomUUID } from 'crypto';
import type BetterSqlite3 from 'better-sqlite3';
import { searchWalmart, buildCartUrl, type WalmartProduct } from './walmart.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item';
}

function makeId(title: string): string {
  return `${slugify(title)}_${Date.now().toString(36)}`;
}

// Parse a raw ingredient string like "2 cups rice" or "1 lb chicken breast"
// into structured parts. Used during URL import.
const UNIT_SET = new Set([
  'cup','cups','tsp','tbsp','tablespoon','tablespoons','teaspoon','teaspoons',
  'oz','ounce','ounces','lb','lbs','pound','pounds','g','gram','grams',
  'kg','ml','l','liter','liters','can','cans','bunch','bunches',
  'piece','pieces','slice','slices','clove','cloves','head','heads',
  'package','packages','bag','bags','jar','jars','bottle','bottles',
  'sprig','sprigs','stalk','stalks','sheet','sheets',
]);

function parseIngredientString(raw: string): { quantity: number | null; unit: string | null; name: string } {
  let s = raw.trim();

  // Extract leading number (integer, decimal, or simple fraction like 1/2 or 1 1/2)
  let quantity: number | null = null;
  const numRe = /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+/;
  const numMatch = s.match(numRe);
  if (numMatch) {
    const raw = numMatch[1].trim();
    if (raw.includes('/')) {
      const parts = raw.split(/\s+/);
      if (parts.length === 2) {
        const [whole, frac] = parts;
        const [n, d] = frac.split('/');
        quantity = parseInt(whole) + parseInt(n) / parseInt(d);
      } else {
        const [n, d] = raw.split('/');
        quantity = parseInt(n) / parseInt(d);
      }
    } else {
      quantity = parseFloat(raw);
    }
    s = s.slice(numMatch[0].length);
  }

  // Extract unit word if recognized
  let unit: string | null = null;
  const words = s.split(/\s+/);
  const firstWord = words[0]?.replace(/\.$/, '').toLowerCase();
  if (firstWord && UNIT_SET.has(firstWord)) {
    unit = firstWord;
    s = words.slice(1).join(' ');
  }

  return { quantity, unit, name: s.trim() || raw.trim() };
}

// ── Router factory ────────────────────────────────────────────────────────────

export function createRouter(db: BetterSqlite3.Database): Router {
  const router = Router();

  // ── Ingredient categories ────────────────────────────────────────────────

  router.get('/ingredient-categories', (_req, res) => {
    const rows = db.prepare('SELECT * FROM ingredient_categories ORDER BY sort_order').all();
    res.json(rows);
  });

  // ── Ingredients ──────────────────────────────────────────────────────────

  router.get('/ingredients', (req, res) => {
    const { category, q } = req.query as Record<string, string>;
    let sql = `
      SELECT i.*, c.name AS category_name, c.store_section
      FROM ingredients i
      JOIN ingredient_categories c ON c.id = i.category_id
    `;
    const params: (string | number)[] = [];
    const where: string[] = [];
    if (category) { where.push('i.category_id = ?'); params.push(category); }
    if (q) { where.push('lower(i.name) LIKE ?'); params.push(`%${q.toLowerCase()}%`); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY c.sort_order, i.name';
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/ingredients/:id', (req, res) => {
    const row = db.prepare(`
      SELECT i.*, c.name AS category_name, c.store_section
      FROM ingredients i JOIN ingredient_categories c ON c.id = i.category_id
      WHERE i.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Ingredient not found' });
    res.json(row);
  });

  router.post('/ingredients', (req, res) => {
    const { name, category_id, default_unit, pantry_staple } = req.body;
    if (!name || !category_id) return res.status(400).json({ error: 'name and category_id required' });

    const cat = db.prepare('SELECT id FROM ingredient_categories WHERE id = ?').get(category_id);
    if (!cat) return res.status(400).json({ error: 'Unknown category_id' });

    const id = slugify(name);
    // If slug already taken, suffix with timestamp
    const existing = db.prepare('SELECT id FROM ingredients WHERE id = ?').get(id);
    const finalId = existing ? `${id}_${Date.now().toString(36)}` : id;

    try {
      db.prepare(`
        INSERT INTO ingredients (id, name, category_id, default_unit, pantry_staple)
        VALUES (?, ?, ?, ?, ?)
      `).run(finalId, name.trim(), category_id, default_unit ?? null, pantry_staple ? 1 : 0);
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'An ingredient with this name already exists' });
      }
      throw e;
    }

    res.status(201).json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(finalId));
  });

  router.put('/ingredients/:id', (req, res) => {
    const row = db.prepare('SELECT id FROM ingredients WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Ingredient not found' });

    const { name, category_id, default_unit, pantry_staple } = req.body;
    db.prepare(`
      UPDATE ingredients SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        default_unit = COALESCE(?, default_unit),
        pantry_staple = COALESCE(?, pantry_staple)
      WHERE id = ?
    `).run(name ?? null, category_id ?? null, default_unit ?? null,
           pantry_staple != null ? (pantry_staple ? 1 : 0) : null, req.params.id);

    res.json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id));
  });

  // ── Recipes ──────────────────────────────────────────────────────────────

  router.get('/recipes', (req, res) => {
    const { tags, q } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM recipes';
    const params: string[] = [];
    const where: string[] = [];

    if (q) { where.push('lower(title) LIKE ?'); params.push(`%${q.toLowerCase()}%`); }
    // Tags filter: all provided tags must appear in the JSON array
    if (tags) {
      for (const tag of tags.split(',').map(t => t.trim()).filter(Boolean)) {
        where.push(`EXISTS (SELECT 1 FROM json_each(recipes.tags) WHERE value = ?)`);
        params.push(tag);
      }
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY updated_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  router.get('/recipes/:id', (req, res) => {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const ingredients = db.prepare(`
      SELECT ri.*, i.name AS ingredient_name, i.category_id,
             c.name AS category_name, c.store_section
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      JOIN ingredient_categories c ON c.id = i.category_id
      WHERE ri.recipe_id = ?
      ORDER BY ri.sort_order, ri.id
    `).all(req.params.id);

    const variants = db.prepare('SELECT * FROM recipe_variants WHERE recipe_id = ?').all(req.params.id);
    for (const v of variants as any[]) {
      (v as any).ingredients = db.prepare(`
        SELECT rvi.*, i.name AS ingredient_name
        FROM recipe_variant_ingredients rvi
        JOIN ingredients i ON i.id = rvi.ingredient_id
        WHERE rvi.variant_id = ?
      `).all(v.id);
    }

    res.json({ ...(recipe as object), ingredients, variants });
  });

  router.post('/recipes', (req, res) => {
    const { title, servings, instructions, tags, source_url, notes, ingredients } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const id = makeId(title);
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    db.prepare(`
      INSERT INTO recipes (id, title, servings, instructions, tags, source_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title.trim(), servings ?? 4, instructions ?? null,
           tagsJson, source_url ?? null, notes ?? null);

    if (Array.isArray(ingredients)) {
      for (let i = 0; i < ingredients.length; i++) {
        const { ingredient_id, quantity, unit, notes: inotes } = ingredients[i];
        if (!ingredient_id) continue;
        db.prepare(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, ingredient_id, quantity ?? null, unit ?? null, inotes ?? null, i);
      }
    }

    const created = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
    res.status(201).json(created);
  });

  router.put('/recipes/:id', (req, res) => {
    const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const { title, servings, instructions, tags, source_url, notes } = req.body;
    db.prepare(`
      UPDATE recipes SET
        title        = COALESCE(?, title),
        servings     = COALESCE(?, servings),
        instructions = COALESCE(?, instructions),
        tags         = COALESCE(?, tags),
        source_url   = COALESCE(?, source_url),
        notes        = COALESCE(?, notes),
        updated_at   = datetime('now')
      WHERE id = ?
    `).run(title ?? null, servings ?? null, instructions ?? null,
           tags != null ? JSON.stringify(tags) : null,
           source_url ?? null, notes ?? null, req.params.id);

    res.json(db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id));
  });

  router.delete('/recipes/:id', (req, res) => {
    const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // ── Recipe ingredients ────────────────────────────────────────────────────

  router.post('/recipes/:id/ingredients', (req, res) => {
    const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const { ingredient_id, quantity, unit, notes, sort_order } = req.body;
    if (!ingredient_id) return res.status(400).json({ error: 'ingredient_id required' });

    const ing = db.prepare('SELECT id FROM ingredients WHERE id = ?').get(ingredient_id);
    if (!ing) return res.status(400).json({ error: 'Unknown ingredient_id' });

    const maxOrder = (db.prepare(
      'SELECT MAX(sort_order) AS m FROM recipe_ingredients WHERE recipe_id = ?'
    ).get(req.params.id) as { m: number | null }).m ?? -1;

    const result = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, ingredient_id, quantity ?? null, unit ?? null,
           notes ?? null, sort_order ?? maxOrder + 1);

    const row = db.prepare(`
      SELECT ri.*, i.name AS ingredient_name
      FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/recipes/:id/ingredients/:riId', (req, res) => {
    const ri = db.prepare(
      'SELECT id FROM recipe_ingredients WHERE id = ? AND recipe_id = ?'
    ).get(req.params.riId, req.params.id);
    if (!ri) return res.status(404).json({ error: 'Recipe ingredient not found' });

    const { quantity, unit, notes, sort_order } = req.body;
    db.prepare(`
      UPDATE recipe_ingredients SET
        quantity   = COALESCE(?, quantity),
        unit       = COALESCE(?, unit),
        notes      = COALESCE(?, notes),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(quantity ?? null, unit ?? null, notes ?? null,
           sort_order ?? null, req.params.riId);

    res.json(db.prepare('SELECT * FROM recipe_ingredients WHERE id = ?').get(req.params.riId));
  });

  router.delete('/recipes/:id/ingredients/:riId', (req, res) => {
    const ri = db.prepare(
      'SELECT id FROM recipe_ingredients WHERE id = ? AND recipe_id = ?'
    ).get(req.params.riId, req.params.id);
    if (!ri) return res.status(404).json({ error: 'Recipe ingredient not found' });
    db.prepare('DELETE FROM recipe_ingredients WHERE id = ?').run(req.params.riId);
    res.status(204).end();
  });

  // ── URL import ────────────────────────────────────────────────────────────
  // Fetches a recipe URL and extracts Schema.org Recipe JSON-LD data.

  router.post('/recipes/import-url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    try {

    let html: string;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeApps/1.0; +food)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return res.status(422).json({ error: `Fetch failed: ${resp.status}` });
      html = await resp.text();
    } catch (e: any) {
      return res.status(422).json({ error: `Fetch failed: ${e.message}` });
    }

    // Extract all JSON-LD blocks from <script type="application/ld+json"> tags
    const ldBlocks: unknown[] = [];
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try { ldBlocks.push(JSON.parse(m[1])); } catch { /* skip malformed */ }
    }

    // Find a Recipe schema object (handles @graph wrappers and arrays)
    function findRecipe(obj: unknown): Record<string, unknown> | null {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findRecipe(item);
          if (found) return found;
        }
        return null;
      }
      const o = obj as Record<string, unknown>;
      const type = o['@type'];
      if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return o;
      if (o['@graph']) return findRecipe(o['@graph']);
      return null;
    }

    let recipeData: Record<string, unknown> | null = null;
    for (const block of ldBlocks) {
      recipeData = findRecipe(block);
      if (recipeData) break;
    }

    if (!recipeData) {
      return res.status(422).json({ error: 'No Schema.org Recipe data found at this URL' });
    }

    // Parse servings from recipeYield (e.g. "4 servings", "Serves 6", or plain "4")
    function parseServings(raw: unknown): number {
      const s = Array.isArray(raw) ? String(raw[0]) : String(raw ?? '4');
      const n = parseInt(s.replace(/\D/g, ''));
      return n > 0 ? n : 4;
    }

    // Flatten instructions (HowToStep array or plain strings)
    function flattenInstructions(raw: unknown): string {
      if (!raw) return '';
      if (typeof raw === 'string') return raw;
      if (Array.isArray(raw)) {
        return raw.map((step: unknown) => {
          if (typeof step === 'string') return step;
          if (step && typeof step === 'object') {
            return (step as Record<string, unknown>).text as string ?? '';
          }
          return '';
        }).filter(Boolean).join('\n\n');
      }
      return String(raw);
    }

    const title = String(recipeData.name ?? 'Imported Recipe').trim();
    const servings = parseServings(recipeData.recipeYield);
    const instructions = flattenInstructions(recipeData.recipeInstructions);
    const notes = recipeData.description ? String(recipeData.description).slice(0, 500) : null;
    const recipeId = makeId(title);

    db.prepare(`
      INSERT INTO recipes (id, title, servings, instructions, tags, source_url, notes)
      VALUES (?, ?, ?, ?, '[]', ?, ?)
    `).run(recipeId, title, servings, instructions || null, url, notes);

    // Process ingredients
    const rawIngredients = Array.isArray(recipeData.recipeIngredient)
      ? (recipeData.recipeIngredient as unknown[]).map(String)
      : [];

    const getOrCreateIngredient = db.transaction((name: string): string => {
      const existing = db.prepare(
        'SELECT id FROM ingredients WHERE lower(name) = lower(?)'
      ).get(name) as { id: string } | undefined;
      if (existing) return existing.id;

      const id = slugify(name);
      const taken = db.prepare('SELECT id FROM ingredients WHERE id = ?').get(id);
      const finalId = taken ? `${id}_${Date.now().toString(36)}` : id;
      db.prepare(`
        INSERT INTO ingredients (id, name, category_id) VALUES (?, ?, 'other')
      `).run(finalId, name);
      return finalId;
    });

    for (let i = 0; i < rawIngredients.length; i++) {
      const raw = rawIngredients[i];
      const { quantity, unit, name } = parseIngredientString(raw);
      const ingredientId = getOrCreateIngredient(name);
      db.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(recipeId, ingredientId, quantity, unit,
             // Store the original string so users can verify the parse
             raw !== name ? raw : null, i);
    }

    res.status(201).json(db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId));
    } catch (e: any) {
      console.error('import-url error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Family members ────────────────────────────────────────────────────────

  router.get('/family-members', (_req, res) => {
    res.json(db.prepare('SELECT * FROM family_members ORDER BY id').all());
  });

  router.post('/family-members', (req, res) => {
    const { id, display_name, dietary_flags, notes } = req.body;
    if (!id || !display_name) return res.status(400).json({ error: 'id and display_name required' });
    const flagsJson = JSON.stringify(Array.isArray(dietary_flags) ? dietary_flags : []);
    db.prepare(`
      INSERT INTO family_members (id, display_name, dietary_flags, notes) VALUES (?, ?, ?, ?)
    `).run(slugify(id), display_name.trim(), flagsJson, notes ?? null);
    res.status(201).json(db.prepare('SELECT * FROM family_members WHERE id = ?').get(slugify(id)));
  });

  router.put('/family-members/:id', (req, res) => {
    const row = db.prepare('SELECT id FROM family_members WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Family member not found' });
    const { display_name, dietary_flags, notes } = req.body;
    db.prepare(`
      UPDATE family_members SET
        display_name  = COALESCE(?, display_name),
        dietary_flags = COALESCE(?, dietary_flags),
        notes         = COALESCE(?, notes)
      WHERE id = ?
    `).run(display_name ?? null,
           dietary_flags != null ? JSON.stringify(dietary_flags) : null,
           notes ?? null, req.params.id);
    res.json(db.prepare('SELECT * FROM family_members WHERE id = ?').get(req.params.id));
  });

  router.delete('/family-members/:id', (req, res) => {
    const row = db.prepare('SELECT id FROM family_members WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Family member not found' });
    db.prepare('DELETE FROM family_members WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // ── Menu plans ────────────────────────────────────────────────────────────

  router.get('/menu-plans', (_req, res) => {
    res.json(db.prepare('SELECT * FROM menu_plans ORDER BY week_start DESC').all());
  });

  router.post('/menu-plans', (req, res) => {
    const { name, week_start } = req.body;
    if (!name || !week_start) return res.status(400).json({ error: 'name and week_start required' });
    const id = makeId(name);
    db.prepare('INSERT INTO menu_plans (id, name, week_start) VALUES (?, ?, ?)').run(id, name.trim(), week_start);
    res.status(201).json(db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(id));
  });

  const SLOTS_WITH_RECIPE = `
    SELECT ms.*, r.title AS recipe_title, r.servings AS recipe_servings
    FROM menu_plan_slots ms
    LEFT JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.menu_plan_id = ?
    ORDER BY ms.day_of_week, ms.meal_slot
  `;

  router.get('/menu-plans/:id', (req, res) => {
    const plan = db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Menu plan not found' });
    const slots = db.prepare(SLOTS_WITH_RECIPE).all(req.params.id);
    res.json({ ...(plan as object), slots });
  });

  router.delete('/menu-plans/:id', (req, res) => {
    const plan = db.prepare('SELECT id FROM menu_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Menu plan not found' });
    db.prepare('DELETE FROM menu_plans WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  router.post('/menu-plans/:id/copy', (req, res) => {
    const source = db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(req.params.id) as
      { id: string; name: string } | undefined;
    if (!source) return res.status(404).json({ error: 'Menu plan not found' });

    const { name, week_start } = req.body as { name?: string; week_start?: string };
    if (!week_start) return res.status(400).json({ error: 'week_start required' });
    const newName = (name ?? `${source.name} (copy)`).trim();

    const slots = db.prepare(
      'SELECT day_of_week, meal_slot, recipe_id, servings_override, notes FROM menu_plan_slots WHERE menu_plan_id = ?'
    ).all(req.params.id) as {
      day_of_week: number; meal_slot: string; recipe_id: string | null;
      servings_override: number | null; notes: string | null;
    }[];

    const newId = makeId(newName);
    db.transaction(() => {
      db.prepare('INSERT INTO menu_plans (id, name, week_start) VALUES (?, ?, ?)').run(newId, newName, week_start);
      const insertSlot = db.prepare(`
        INSERT INTO menu_plan_slots (menu_plan_id, day_of_week, meal_slot, recipe_id, servings_override, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const slot of slots) {
        insertSlot.run(newId, slot.day_of_week, slot.meal_slot, slot.recipe_id, slot.servings_override, slot.notes);
      }
    })();

    const newSlots = db.prepare(SLOTS_WITH_RECIPE).all(newId);
    res.status(201).json({ ...(db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(newId) as object), slots: newSlots });
  });

  const SLOT_WITH_RECIPE_BY_ID = `
    SELECT ms.*, r.title AS recipe_title, r.servings AS recipe_servings
    FROM menu_plan_slots ms
    LEFT JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.id = ?
  `;

  // Adds a new slot row. A (plan, day, meal) combination can hold any number
  // of slots — multiple recipes per meal are just multiple rows.
  router.post('/menu-plans/:id/slots', (req, res) => {
    const plan = db.prepare('SELECT id FROM menu_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Menu plan not found' });

    const { day_of_week, meal_slot, recipe_id, servings_override, notes } = req.body;
    if (day_of_week == null || !meal_slot) {
      return res.status(400).json({ error: 'day_of_week and meal_slot required' });
    }
    if (recipe_id) {
      const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe_id);
      if (!recipe) return res.status(400).json({ error: 'Unknown recipe_id' });
    }

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO menu_plan_slots (menu_plan_id, day_of_week, meal_slot, recipe_id, servings_override, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, day_of_week, meal_slot, recipe_id ?? null, servings_override ?? null, notes ?? null);

    res.status(201).json(db.prepare(SLOT_WITH_RECIPE_BY_ID).get(lastInsertRowid));
  });

  // Updates one existing slot row by id (e.g. changing its recipe or servings).
  router.put('/menu-plans/:id/slots/:slotId', (req, res) => {
    const slot = db.prepare(
      'SELECT id FROM menu_plan_slots WHERE id = ? AND menu_plan_id = ?'
    ).get(req.params.slotId, req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const { recipe_id, servings_override, notes } = req.body;
    if (recipe_id) {
      const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe_id);
      if (!recipe) return res.status(400).json({ error: 'Unknown recipe_id' });
    }

    db.prepare(`
      UPDATE menu_plan_slots SET
        recipe_id         = ?,
        servings_override = ?,
        notes              = ?
      WHERE id = ?
    `).run(recipe_id ?? null, servings_override ?? null, notes ?? null, req.params.slotId);

    res.json(db.prepare(SLOT_WITH_RECIPE_BY_ID).get(req.params.slotId));
  });

  router.delete('/menu-plans/:id/slots/:slotId', (req, res) => {
    const slot = db.prepare(
      'SELECT id FROM menu_plan_slots WHERE id = ? AND menu_plan_id = ?'
    ).get(req.params.slotId, req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    db.prepare('DELETE FROM menu_plan_slots WHERE id = ?').run(req.params.slotId);
    res.status(204).end();
  });

  // Fill empty dinner slots with recipes from the library, avoiding repeats within the week.
  router.post('/menu-plans/:id/suggest', (req, res) => {
    const plan = db.prepare('SELECT id FROM menu_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Menu plan not found' });

    const allRecipes = db.prepare('SELECT id FROM recipes').all() as { id: string }[];
    if (!allRecipes.length) {
      return res.status(422).json({ error: 'No recipes in library to suggest from' });
    }

    const alreadyUsed = new Set(
      (db.prepare(`
        SELECT recipe_id FROM menu_plan_slots
        WHERE menu_plan_id = ? AND meal_slot = 'dinner' AND recipe_id IS NOT NULL
      `).all(req.params.id) as { recipe_id: string }[]).map(r => r.recipe_id)
    );

    const existingDays = new Set(
      (db.prepare(`
        SELECT day_of_week FROM menu_plan_slots
        WHERE menu_plan_id = ? AND meal_slot = 'dinner'
      `).all(req.params.id) as { day_of_week: number }[]).map(r => r.day_of_week)
    );

    // Pool = recipes not yet used this week; fall back to full library if exhausted
    const pool = allRecipes.filter(r => !alreadyUsed.has(r.id));

    for (const day of [0,1,2,3,4,5,6]) {
      if (existingDays.has(day)) continue;
      const available = pool.length > 0 ? pool : allRecipes;
      const pick = available[Math.floor(Math.random() * available.length)];
      db.prepare(`
        INSERT INTO menu_plan_slots (menu_plan_id, day_of_week, meal_slot, recipe_id)
        VALUES (?, ?, 'dinner', ?)
      `).run(req.params.id, day, pick.id);
      const poolIdx = pool.indexOf(pick);
      if (poolIdx >= 0) pool.splice(poolIdx, 1);
    }

    const slots = db.prepare(SLOTS_WITH_RECIPE).all(req.params.id);
    res.json({ ...db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(req.params.id), slots });
  });

  // ── Shopping lists ────────────────────────────────────────────────────────

  router.get('/shopping-lists', (_req, res) => {
    res.json(db.prepare('SELECT * FROM shopping_lists ORDER BY created_at DESC').all());
  });

  router.post('/shopping-lists', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = makeId(name);
    db.prepare('INSERT INTO shopping_lists (id, name) VALUES (?, ?)').run(id, name.trim());
    res.status(201).json(db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(id));
  });

  // Must be defined before GET /shopping-lists/:id so Express doesn't swallow
  // "from-plan" as a list ID on GET (they're different HTTP methods, but
  // keeping order consistent is clearer).
  router.post('/shopping-lists/from-plan/:planId', (req, res) => {
    const plan = db.prepare('SELECT * FROM menu_plans WHERE id = ?').get(req.params.planId) as
      { id: string; name: string } | undefined;
    if (!plan) return res.status(404).json({ error: 'Menu plan not found' });

    const { name, servings } = req.body;
    const listName: string = name ?? `${plan.name} — Shopping List`;
    const targetServings: number | null = servings ? Number(servings) : null;

    const slots = db.prepare(`
      SELECT ms.recipe_id, ms.servings_override, r.servings AS recipe_servings
      FROM menu_plan_slots ms
      JOIN recipes r ON r.id = ms.recipe_id
      WHERE ms.menu_plan_id = ? AND ms.recipe_id IS NOT NULL
    `).all(req.params.planId) as {
      recipe_id: string;
      servings_override: number | null;
      recipe_servings: number;
    }[];

    if (!slots.length) {
      return res.status(422).json({ error: 'Menu plan has no assigned recipes' });
    }

    // Consolidate ingredients: group by (ingredient_id, unit) → sum quantities.
    // If two rows share ingredient+unit, their quantities are added.
    // If units differ for the same ingredient, they appear as separate items.
    interface TallyEntry {
      ingredient_id: string;
      name: string;
      unit: string | null;
      quantity: number | null;
      category_id: string;
    }
    const tally = new Map<string, TallyEntry>();

    for (const slot of slots) {
      const effective = slot.servings_override ?? targetServings ?? slot.recipe_servings;
      const scale = effective / slot.recipe_servings;

      const ings = db.prepare(`
        SELECT ri.ingredient_id, ri.quantity, ri.unit, i.name, i.category_id
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ?
      `).all(slot.recipe_id) as {
        ingredient_id: string; quantity: number | null;
        unit: string | null; name: string; category_id: string;
      }[];

      for (const ing of ings) {
        const key = `${ing.ingredient_id}|${ing.unit ?? ''}`;
        const scaled = ing.quantity != null ? Math.round(ing.quantity * scale * 100) / 100 : null;
        const existing = tally.get(key);
        if (existing) {
          existing.quantity = existing.quantity != null && scaled != null
            ? Math.round((existing.quantity + scaled) * 100) / 100
            : null;
        } else {
          tally.set(key, {
            ingredient_id: ing.ingredient_id, name: ing.name,
            unit: ing.unit, quantity: scaled, category_id: ing.category_id,
          });
        }
      }
    }

    const listId = makeId(listName);
    db.prepare('INSERT INTO shopping_lists (id, name, menu_plan_id) VALUES (?, ?, ?)')
      .run(listId, listName.trim(), req.params.planId);

    let sortOrder = 0;
    for (const item of tally.values()) {
      db.prepare(`
        INSERT INTO shopping_list_items
          (shopping_list_id, ingredient_id, name, quantity, unit, category_id, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(listId, item.ingredient_id, item.name, item.quantity, item.unit,
             item.category_id, sortOrder++);
    }

    res.status(201).json(getListDetail(listId));
  });

  function getListDetail(listId: string) {
    const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(listId);
    const items = db.prepare(`
      SELECT sli.*, ic.store_section, ic.sort_order AS category_sort_order
      FROM shopping_list_items sli
      LEFT JOIN ingredient_categories ic ON ic.id = sli.category_id
      WHERE sli.shopping_list_id = ?
      ORDER BY COALESCE(ic.sort_order, 999), sli.sort_order, sli.id
    `).all(listId);
    return { ...(list as object), items };
  }

  router.get('/shopping-lists/:id', (req, res) => {
    const list = db.prepare('SELECT id FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Shopping list not found' });
    res.json(getListDetail(req.params.id));
  });

  router.delete('/shopping-lists/:id', (req, res) => {
    const list = db.prepare('SELECT id FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Shopping list not found' });
    db.prepare('DELETE FROM shopping_lists WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  router.patch('/shopping-list-items/:id', (req, res) => {
    const item = db.prepare('SELECT id FROM shopping_list_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Shopping list item not found' });
    const { checked } = req.body;
    db.prepare('UPDATE shopping_list_items SET checked = ? WHERE id = ?')
      .run(checked ? 1 : 0, Number(req.params.id));
    res.json(db.prepare('SELECT * FROM shopping_list_items WHERE id = ?').get(req.params.id));
  });

  router.delete('/shopping-list-items/:id', (req, res) => {
    const item = db.prepare('SELECT id FROM shopping_list_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Shopping list item not found' });
    db.prepare('DELETE FROM shopping_list_items WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  });

  router.post('/shopping-lists/:id/items', (req, res) => {
    const list = db.prepare('SELECT id FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Shopping list not found' });

    const { name, quantity, unit, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const maxOrder = (db.prepare(
      'SELECT MAX(sort_order) AS m FROM shopping_list_items WHERE shopping_list_id = ?'
    ).get(req.params.id) as { m: number | null }).m ?? -1;

    const result = db.prepare(`
      INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, name.trim(), quantity ?? null, unit?.trim() || null, notes ?? null, maxOrder + 1);

    res.status(201).json(db.prepare('SELECT * FROM shopping_list_items WHERE id = ?').get(result.lastInsertRowid));
  });

  router.patch('/shopping-lists/:id', (req, res) => {
    const list = db.prepare('SELECT id FROM shopping_lists WHERE id = ?').get(req.params.id);
    if (!list) return res.status(404).json({ error: 'Shopping list not found' });

    const { status } = req.body;
    const VALID = ['active', 'completed', 'archived'];
    if (!status || !VALID.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
    }
    db.prepare('UPDATE shopping_lists SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json(db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id));
  });

  // ── Feature requests ─────────────────────────────────────────────────────────

  router.get('/feature-requests', (_req, res) => {
    res.json(db.prepare('SELECT * FROM feature_requests ORDER BY created_at DESC').all());
  });

  router.post('/feature-requests', async (req, res) => {
    const { title, description, submitted_by } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    const id = randomUUID();
    // Auto-prefix so GitHub issues are clearly scoped to this project.
    const prefixedTitle = title.trim().startsWith('Food:') ? title.trim() : `Food: ${title.trim()}`;
    db.prepare(`
      INSERT INTO feature_requests (request_id, title, description, submitted_by)
      VALUES (?, ?, ?, ?)
    `).run(id, prefixedTitle, description ?? null, submitted_by ?? null);

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      try {
        const repo = process.env.GITHUB_REPO ?? 'nickbenes/home-apps';
        const ghBody: Record<string, string> = { title: prefixedTitle };
        if (description?.trim()) ghBody.body = description.trim();
        const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'home-apps-food',
          },
          body: JSON.stringify(ghBody),
        });
        if (ghRes.ok) {
          const data = await ghRes.json() as { number: number; html_url: string; state: string };
          db.prepare(`
            UPDATE feature_requests
            SET github_issue_number = ?, github_issue_url = ?, github_issue_status = ?,
                updated_at = datetime('now')
            WHERE request_id = ?
          `).run(data.number, data.html_url, data.state, id);
        }
      } catch { /* skip — issue creation is best-effort */ }
    }

    res.status(201).json(db.prepare('SELECT * FROM feature_requests WHERE request_id = ?').get(id));
  });

  router.patch('/feature-requests/:id', (req, res) => {
    const ALLOWED = ['title', 'description', 'submitted_by', 'status', 'github_issue_number'] as const;
    const entries = Object.entries(req.body).filter(([k]) => (ALLOWED as readonly string[]).includes(k));
    if (!entries.length) return res.status(400).json({ error: `Allowed: ${ALLOWED.join(', ')}` });
    const row = db.prepare('SELECT 1 FROM feature_requests WHERE request_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    db.prepare(
      `UPDATE feature_requests SET ${sets}, updated_at = datetime('now') WHERE request_id = ?`
    ).run([...entries.map(([, v]) => v), req.params.id]);
    res.json(db.prepare('SELECT * FROM feature_requests WHERE request_id = ?').get(req.params.id));
  });

  router.delete('/feature-requests/:id', (req, res) => {
    const row = db.prepare('SELECT 1 FROM feature_requests WHERE request_id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    db.prepare('DELETE FROM feature_requests WHERE request_id = ?').run(req.params.id);
    res.status(204).send();
  });

  // Sync GitHub issues ↔ feature_requests.
  // Only imports issues whose title starts with "Food:" to avoid pulling in other projects.
  // Requires GITHUB_TOKEN env var; optional GITHUB_REPO (default: nickbenes/home-apps).
  router.post('/feature-requests/sync', async (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(501).json({ error: 'GITHUB_TOKEN env var not set — sync unavailable' });
    }
    const repo = process.env.GITHUB_REPO ?? 'nickbenes/home-apps';
    const ghHeaders = { Authorization: `Bearer ${token}`, 'User-Agent': 'home-apps-food' };

    const linked = db.prepare(
      'SELECT request_id, github_issue_number FROM feature_requests WHERE github_issue_number IS NOT NULL'
    ).all() as { request_id: string; github_issue_number: number }[];

    let updated = 0;
    for (const r of linked) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${repo}/issues/${r.github_issue_number}`,
          { headers: ghHeaders }
        );
        if (!ghRes.ok) continue;
        const data = await ghRes.json() as { state: string; html_url: string };
        db.prepare(`
          UPDATE feature_requests
          SET github_issue_status = ?, github_issue_url = ?,
              status = CASE WHEN ? = 'closed' AND status NOT IN ('declined') THEN 'done' ELSE status END,
              updated_at = datetime('now')
          WHERE request_id = ?
        `).run(data.state, data.html_url, data.state, r.request_id);
        updated++;
      } catch { /* skip individual failures */ }
    }

    let imported = 0;
    try {
      const existingNums = new Set(
        (db.prepare('SELECT github_issue_number FROM feature_requests WHERE github_issue_number IS NOT NULL').all() as { github_issue_number: number }[])
          .map(r => r.github_issue_number)
      );

      type GhIssue = { number: number; title: string; body: string | null; html_url: string; state: string; pull_request?: unknown };
      const issues: GhIssue[] = [];
      for (const page of [1, 2]) {
        const r = await fetch(
          `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&page=${page}`,
          { headers: ghHeaders }
        );
        if (!r.ok) break;
        const batch = await r.json() as GhIssue[];
        issues.push(...batch.filter(i => !i.pull_request));
        if (batch.length < 100) break;
      }

      for (const issue of issues) {
        if (existingNums.has(issue.number)) continue;
        if (!issue.title.toLowerCase().startsWith('food:')) continue;
        const newId = randomUUID();
        db.prepare(`
          INSERT INTO feature_requests
            (request_id, title, description, github_issue_number, github_issue_url, github_issue_status,
             submitted_by, status)
          VALUES (?, ?, ?, ?, ?, ?, 'GitHub',
            CASE WHEN ? = 'closed' THEN 'done' ELSE 'open' END)
        `).run(newId, issue.title, issue.body ?? null, issue.number, issue.html_url, issue.state, issue.state);
        imported++;
      }
    } catch { /* skip import failures */ }

    res.json({ synced: linked.length, updated, imported });
  });

  // ── Walmart ──────────────────────────────────────────────────────────────

  router.post('/walmart/cart-url', async (req, res) => {
    const { listId } = req.body as { listId?: string };
    if (!listId) return res.status(400).json({ error: 'listId required' });

    const items = db.prepare(`
      SELECT id, name, quantity, unit FROM shopping_list_items
      WHERE shopping_list_id = ? AND checked = 0
      ORDER BY id
    `).all(listId) as { id: number; name: string; quantity: number | null; unit: string | null }[];

    if (items.length === 0) return res.status(400).json({ error: 'No unchecked items in list' });

    const matched: { item: typeof items[0]; product: WalmartProduct; cartQuantity: number }[] = [];
    const unmatched: typeof items = [];

    await Promise.all(items.map(async item => {
      try {
        const results = await searchWalmart(item.name, 1);
        const product = results[0];
        // A line with no usable itemId can't be added to the cart — treat it
        // as unmatched instead of letting it produce a malformed cart-url segment
        // that could fail the whole batch.
        if (product && product.itemId) {
          const cartQuantity = Math.max(1, Math.ceil((item.quantity ?? 1) / product.packCount));
          matched.push({ item, product, cartQuantity });
        } else {
          unmatched.push(item);
        }
      } catch {
        unmatched.push(item);
      }
    }));

    const cartItems = matched.map(({ product, cartQuantity }) => ({
      itemId: product.itemId,
      quantity: cartQuantity,
    }));

    const cartUrl = buildCartUrl(cartItems);
    res.json({ cartUrl, matched, unmatched });
  });

  return router;
}
