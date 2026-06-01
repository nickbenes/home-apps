import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTestDb, seedFixtures } from './helpers/testDb';
import { createRouter } from '../backend/routes';

function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/food/api', createRouter(db));
  return app;
}

describe('Food API', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    seedFixtures(db);
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
    jest.restoreAllMocks();
  });

  // ── Ingredient categories ────────────────────────────────────────────────

  describe('GET /food/api/ingredient-categories', () => {
    test('returns all seeded categories ordered by sort_order', async () => {
      const res = await request(app).get('/food/api/ingredient-categories');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(9);
      expect(res.body[0].id).toBe('proteins'); // sort_order 10 = first
    });
  });

  // ── Ingredients ──────────────────────────────────────────────────────────

  describe('GET /food/api/ingredients', () => {
    test('returns all ingredients with category info', async () => {
      const res = await request(app).get('/food/api/ingredients');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body[0]).toHaveProperty('category_name');
      expect(res.body[0]).toHaveProperty('store_section');
    });

    test('filters by category', async () => {
      const res = await request(app).get('/food/api/ingredients?category=proteins');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.every((i: any) => i.category_id === 'proteins')).toBe(true);
    });

    test('searches by name (case-insensitive)', async () => {
      const res = await request(app).get('/food/api/ingredients?q=CHICKEN');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((i: any) => i.id === 'chicken_breast')).toBe(true);
    });

    test('returns empty array when no match', async () => {
      const res = await request(app).get('/food/api/ingredients?q=xyznosuchingredient');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /food/api/ingredients/:id', () => {
    test('returns ingredient with category info', async () => {
      const res = await request(app).get('/food/api/ingredients/chicken_breast');
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Chicken Breast');
      expect(res.body.category_name).toBe('Proteins');
    });

    test('404 for unknown id', async () => {
      const res = await request(app).get('/food/api/ingredients/no_such');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /food/api/ingredients', () => {
    test('creates ingredient with correct slug id', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Broccoli', category_id: 'produce' });
      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBe('broccoli');
      expect(res.body.category_id).toBe('produce');
      expect(res.body.pantry_staple).toBe(0);
    });

    test('sets pantry_staple flag', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Salt', category_id: 'spices', pantry_staple: true });
      expect(res.statusCode).toBe(201);
      expect(res.body.pantry_staple).toBe(1);
    });

    test('stores default_unit', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Pasta', category_id: 'grains', default_unit: 'lbs' });
      expect(res.statusCode).toBe(201);
      expect(res.body.default_unit).toBe('lbs');
    });

    test('400 when name missing', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ category_id: 'produce' });
      expect(res.statusCode).toBe(400);
    });

    test('400 when category_id missing', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Something' });
      expect(res.statusCode).toBe(400);
    });

    test('400 when category_id is unknown', async () => {
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Something', category_id: 'nonexistent' });
      expect(res.statusCode).toBe(400);
    });

    test('409 on duplicate name', async () => {
      await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Duplicate Veg', category_id: 'produce' });
      const res = await request(app)
        .post('/food/api/ingredients')
        .send({ name: 'Duplicate Veg', category_id: 'produce' });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('PUT /food/api/ingredients/:id', () => {
    test('updates name and default_unit', async () => {
      const res = await request(app)
        .put('/food/api/ingredients/ground_beef')
        .send({ default_unit: 'oz', pantry_staple: false });
      expect(res.statusCode).toBe(200);
      expect(res.body.default_unit).toBe('oz');
      expect(res.body.pantry_staple).toBe(0);
    });
  });

  // ── Recipes ──────────────────────────────────────────────────────────────

  describe('GET /food/api/recipes', () => {
    test('returns all recipes', async () => {
      const res = await request(app).get('/food/api/recipes');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((r: any) => r.id === 'test_stir_fry')).toBe(true);
    });

    test('filters by tag', async () => {
      const res = await request(app).get('/food/api/recipes?tags=weeknight');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((r: any) => r.id === 'test_stir_fry')).toBe(true);
    });

    test('returns empty for unknown tag', async () => {
      const res = await request(app).get('/food/api/recipes?tags=no_such_tag_xyz');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    test('filters by multiple tags (AND)', async () => {
      const res = await request(app).get('/food/api/recipes?tags=weeknight,dairy-free');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((r: any) => r.id === 'test_stir_fry')).toBe(true);
      // A recipe missing one of the tags should not appear
      const noneRes = await request(app).get('/food/api/recipes?tags=weeknight,no_such_tag');
      expect(noneRes.body).toHaveLength(0);
    });

    test('searches by title (case-insensitive)', async () => {
      const res = await request(app).get('/food/api/recipes?q=stir');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((r: any) => r.id === 'test_stir_fry')).toBe(true);
    });
  });

  describe('POST /food/api/recipes', () => {
    test('creates recipe with slug+timestamp id', async () => {
      const res = await request(app)
        .post('/food/api/recipes')
        .send({ title: 'Simple Pasta', servings: 6 });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Simple Pasta');
      expect(res.body.servings).toBe(6);
      expect(res.body.id).toMatch(/^simple_pasta_/);
    });

    test('defaults servings to 4', async () => {
      const res = await request(app)
        .post('/food/api/recipes')
        .send({ title: 'Minimal Recipe' });
      expect(res.statusCode).toBe(201);
      expect(res.body.servings).toBe(4);
    });

    test('stores tags as JSON string', async () => {
      const res = await request(app)
        .post('/food/api/recipes')
        .send({ title: 'Tagged Recipe', tags: ['weeknight', 'dairy-free'] });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body.tags)).toEqual(['weeknight', 'dairy-free']);
    });

    test('creates recipe with inline ingredients', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes')
        .send({
          title: 'Inline Test',
          ingredients: [
            { ingredient_id: 'chicken_breast', quantity: 2, unit: 'lbs' },
            { ingredient_id: 'olive_oil', quantity: 2, unit: 'tbsp' },
          ],
        });
      expect(createRes.statusCode).toBe(201);

      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      expect(detailRes.body.ingredients).toHaveLength(2);
      expect(detailRes.body.ingredients[0].quantity).toBe(2);
    });

    test('skips inline ingredient entries with no ingredient_id', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes')
        .send({ title: 'Skip Test', ingredients: [{ quantity: 1 }] });
      expect(createRes.statusCode).toBe(201);
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      expect(detailRes.body.ingredients).toHaveLength(0);
    });

    test('400 when title missing', async () => {
      const res = await request(app)
        .post('/food/api/recipes')
        .send({ servings: 4 });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /food/api/recipes/:id', () => {
    test('returns recipe with ingredients array', async () => {
      const res = await request(app).get('/food/api/recipes/test_stir_fry');
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Test Stir Fry');
      expect(Array.isArray(res.body.ingredients)).toBe(true);
      expect(Array.isArray(res.body.variants)).toBe(true);
    });

    test('ingredient rows include name and store_section', async () => {
      const res = await request(app).get('/food/api/recipes/test_stir_fry');
      const ing = res.body.ingredients[0];
      expect(ing.ingredient_name).toBe('Chicken Breast');
      expect(ing.store_section).toBe('Meat & Seafood');
    });

    test('404 for unknown id', async () => {
      const res = await request(app).get('/food/api/recipes/no_such_recipe');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /food/api/recipes/:id', () => {
    test('updates title', async () => {
      const res = await request(app)
        .put('/food/api/recipes/test_stir_fry')
        .send({ title: 'Updated Stir Fry' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Stir Fry');
    });

    test('updates tags array', async () => {
      const res = await request(app)
        .put('/food/api/recipes/test_stir_fry')
        .send({ tags: ['new-tag', 'another'] });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body.tags)).toEqual(['new-tag', 'another']);
    });

    test('bumps updated_at', async () => {
      const before = (db.prepare('SELECT updated_at FROM recipes WHERE id = ?')
        .get('test_stir_fry') as any).updated_at;
      await new Promise(r => setTimeout(r, 1100));
      await request(app).put('/food/api/recipes/test_stir_fry').send({ title: 'New Title' });
      const after = (db.prepare('SELECT updated_at FROM recipes WHERE id = ?')
        .get('test_stir_fry') as any).updated_at;
      expect(after > before).toBe(true);
    });

    test('404 for unknown id', async () => {
      const res = await request(app)
        .put('/food/api/recipes/no_such')
        .send({ title: 'X' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /food/api/recipes/:id', () => {
    test('deletes recipe', async () => {
      const del = await request(app).delete('/food/api/recipes/test_stir_fry');
      expect(del.statusCode).toBe(204);
      const get = await request(app).get('/food/api/recipes/test_stir_fry');
      expect(get.statusCode).toBe(404);
    });

    test('cascades delete to recipe_ingredients', async () => {
      await request(app).delete('/food/api/recipes/test_stir_fry');
      const count = (db.prepare(
        'SELECT COUNT(*) AS n FROM recipe_ingredients WHERE recipe_id = ?'
      ).get('test_stir_fry') as any).n;
      expect(count).toBe(0);
    });

    test('404 for unknown id', async () => {
      const res = await request(app).delete('/food/api/recipes/no_such');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Recipe ingredients ────────────────────────────────────────────────────

  describe('POST /food/api/recipes/:id/ingredients', () => {
    test('adds ingredient and returns joined row', async () => {
      const res = await request(app)
        .post('/food/api/recipes/test_stir_fry/ingredients')
        .send({ ingredient_id: 'ground_beef', quantity: 1.5, unit: 'lbs', notes: 'optional' });
      expect(res.statusCode).toBe(201);
      expect(res.body.ingredient_name).toBe('Ground Beef');
      expect(res.body.quantity).toBe(1.5);
      expect(res.body.notes).toBe('optional');
    });

    test('auto-assigns sort_order after existing rows', async () => {
      const r1 = await request(app)
        .post('/food/api/recipes/test_stir_fry/ingredients')
        .send({ ingredient_id: 'ground_beef' });
      const r2 = await request(app)
        .post('/food/api/recipes/test_stir_fry/ingredients')
        .send({ ingredient_id: 'olive_oil' });
      expect(r2.body.sort_order).toBeGreaterThan(r1.body.sort_order);
    });

    test('400 when ingredient_id missing', async () => {
      const res = await request(app)
        .post('/food/api/recipes/test_stir_fry/ingredients')
        .send({ quantity: 1 });
      expect(res.statusCode).toBe(400);
    });

    test('400 when ingredient_id unknown', async () => {
      const res = await request(app)
        .post('/food/api/recipes/test_stir_fry/ingredients')
        .send({ ingredient_id: 'no_such_ing' });
      expect(res.statusCode).toBe(400);
    });

    test('404 for unknown recipe', async () => {
      const res = await request(app)
        .post('/food/api/recipes/no_such/ingredients')
        .send({ ingredient_id: 'chicken_breast' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /food/api/recipes/:id/ingredients/:riId', () => {
    test('updates quantity and unit', async () => {
      const riId = (db.prepare(
        'SELECT id FROM recipe_ingredients WHERE recipe_id = ?'
      ).get('test_stir_fry') as any).id;

      const res = await request(app)
        .put(`/food/api/recipes/test_stir_fry/ingredients/${riId}`)
        .send({ quantity: 3.5, unit: 'oz' });
      expect(res.statusCode).toBe(200);
      expect(res.body.quantity).toBe(3.5);
      expect(res.body.unit).toBe('oz');
    });

    test('404 when riId belongs to a different recipe', async () => {
      const riId = (db.prepare(
        'SELECT id FROM recipe_ingredients WHERE recipe_id = ?'
      ).get('test_stir_fry') as any).id;

      const res = await request(app)
        .put(`/food/api/recipes/wrong_recipe_id/ingredients/${riId}`)
        .send({ quantity: 1 });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /food/api/recipes/:id/ingredients/:riId', () => {
    test('removes ingredient from recipe', async () => {
      const riId = (db.prepare(
        'SELECT id FROM recipe_ingredients WHERE recipe_id = ?'
      ).get('test_stir_fry') as any).id;

      const res = await request(app)
        .delete(`/food/api/recipes/test_stir_fry/ingredients/${riId}`);
      expect(res.statusCode).toBe(204);

      const check = db.prepare('SELECT id FROM recipe_ingredients WHERE id = ?').get(riId);
      expect(check).toBeUndefined();
    });

    test('404 for unknown riId', async () => {
      const res = await request(app)
        .delete('/food/api/recipes/test_stir_fry/ingredients/99999');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── URL import ────────────────────────────────────────────────────────────

  describe('POST /food/api/recipes/import-url', () => {
    const MOCK_RECIPE_HTML = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Chicken Stir Fry",
        "recipeYield": "4 servings",
        "recipeIngredient": [
          "1 lb chicken breast",
          "2 cups rice",
          "1/2 cup soy sauce"
        ],
        "recipeInstructions": [
          {"@type": "HowToStep", "text": "Cut chicken into strips."},
          {"@type": "HowToStep", "text": "Cook rice according to package."}
        ],
        "description": "A quick weeknight stir fry."
      }
      </script></head><body></body></html>`;

    beforeEach(() => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        text: async () => MOCK_RECIPE_HTML,
      });
    });

    test('creates recipe from JSON-LD metadata', async () => {
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Chicken Stir Fry');
      expect(res.body.servings).toBe(4);
      expect(res.body.source_url).toBe('https://example.com/recipe');
      expect(res.body.notes).toContain('quick weeknight');
    });

    test('creates ingredient rows from recipeIngredient list', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      expect(detailRes.body.ingredients).toHaveLength(3);
    });

    test('parses integer quantity and unit', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      const chicken = detailRes.body.ingredients.find((i: any) => /chicken/i.test(i.ingredient_name));
      expect(chicken.quantity).toBe(1);
      expect(chicken.unit).toBe('lb');
    });

    test('parses fraction quantity (1/2)', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      const soy = detailRes.body.ingredients.find((i: any) => /soy/i.test(i.ingredient_name));
      expect(soy.quantity).toBe(0.5);
      expect(soy.unit).toBe('cup');
    });

    test('stores original string in notes when parse extracts something', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      // A parsed ingredient should have the raw string in notes
      const chicken = detailRes.body.ingredients.find((i: any) => /chicken/i.test(i.ingredient_name));
      expect(chicken.notes).toBe('1 lb chicken breast');
    });

    test('flattens HowToStep instructions to newline-separated text', async () => {
      const createRes = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/recipe' });
      const detailRes = await request(app).get(`/food/api/recipes/${createRes.body.id}`);
      expect(detailRes.body.instructions).toContain('Cut chicken into strips');
      expect(detailRes.body.instructions).toContain('Cook rice according to package');
    });

    test('handles @graph wrapper', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        text: async () => `<html><head><script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {"@type": "WebPage", "name": "Food Blog"},
              {"@type": "Recipe", "name": "Graph Recipe", "recipeYield": "2",
               "recipeIngredient": [], "recipeInstructions": []}
            ]
          }
        </script></head></html>`,
      });
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/graph' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Graph Recipe');
    });

    test('400 when url is missing', async () => {
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({});
      expect(res.statusCode).toBe(400);
    });

    test('422 when no Recipe schema found in page', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        text: async () => '<html><body>No recipe here</body></html>',
      });
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/norecipe' });
      expect(res.statusCode).toBe(422);
    });

    test('422 when fetch returns non-200', async () => {
      jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: false,
        status: 403,
      });
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/blocked' });
      expect(res.statusCode).toBe(422);
    });

    test('422 when fetch throws (network error)', async () => {
      jest.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('ECONNREFUSED'));
      const res = await request(app)
        .post('/food/api/recipes/import-url')
        .send({ url: 'https://example.com/error' });
      expect(res.statusCode).toBe(422);
    });
  });

  // ── Family members ────────────────────────────────────────────────────────

  describe('GET /food/api/family-members', () => {
    test('returns all family members', async () => {
      const res = await request(app).get('/food/api/family-members');
      expect(res.statusCode).toBe(200);
      expect(res.body.some((m: any) => m.id === 'member_1')).toBe(true);
    });
  });

  describe('POST /food/api/family-members', () => {
    test('creates member with dietary flags', async () => {
      const res = await request(app)
        .post('/food/api/family-members')
        .send({ id: 'new_member', display_name: 'New Person', dietary_flags: ['dairy-free', 'low-sugar'] });
      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBe('new_member');
      expect(JSON.parse(res.body.dietary_flags)).toContain('dairy-free');
    });

    test('slugifies the provided id', async () => {
      const res = await request(app)
        .post('/food/api/family-members')
        .send({ id: 'My Member 2', display_name: 'Person Two' });
      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBe('my_member_2');
    });

    test('defaults dietary_flags to empty array', async () => {
      const res = await request(app)
        .post('/food/api/family-members')
        .send({ id: 'plain_member', display_name: 'Plain' });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body.dietary_flags)).toEqual([]);
    });

    test('400 when id missing', async () => {
      const res = await request(app)
        .post('/food/api/family-members')
        .send({ display_name: 'No ID' });
      expect(res.statusCode).toBe(400);
    });

    test('400 when display_name missing', async () => {
      const res = await request(app)
        .post('/food/api/family-members')
        .send({ id: 'no_name' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /food/api/family-members/:id', () => {
    test('updates display_name', async () => {
      const res = await request(app)
        .put('/food/api/family-members/member_1')
        .send({ display_name: 'Updated Name' });
      expect(res.statusCode).toBe(200);
      expect(res.body.display_name).toBe('Updated Name');
    });

    test('updates dietary_flags', async () => {
      const res = await request(app)
        .put('/food/api/family-members/member_1')
        .send({ dietary_flags: ['vegetarian', 'gluten-free'] });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body.dietary_flags)).toContain('vegetarian');
    });

    test('404 for unknown id', async () => {
      const res = await request(app)
        .put('/food/api/family-members/no_such')
        .send({ display_name: 'X' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /food/api/family-members/:id', () => {
    test('removes member', async () => {
      const del = await request(app).delete('/food/api/family-members/member_1');
      expect(del.statusCode).toBe(204);
      const list = await request(app).get('/food/api/family-members');
      expect(list.body.every((m: any) => m.id !== 'member_1')).toBe(true);
    });

    test('404 for unknown id', async () => {
      const res = await request(app).delete('/food/api/family-members/no_such');
      expect(res.statusCode).toBe(404);
    });
  });
});
