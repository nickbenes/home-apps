/**
 * Reads a CSV with Maureen / Nick / Merged tag columns and applies tags
 * to matching entities in the database.
 *
 * Supported entity types:
 *   budget-item   — matches by Category + Budget Item columns
 *   recurring     — matches by Name column (case-insensitive)
 *
 * Usage:
 *   tsx projects/finance/backend/tag-from-csv.ts budget-item  <csv-path>
 *   tsx projects/finance/backend/tag-from-csv.ts recurring     <csv-path>
 *
 * The CSV must have columns: Maureen, Nick, Merged
 * Plus for budget-item:  Category, Budget Item
 * Plus for recurring:    Name  (or Recurring Item)
 */

import { randomUUID } from 'crypto';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { getDb } from './db.js';

// ── Tag value cleaning ────────────────────────────────────────────────────────

/**
 * Normalizes a raw cell value into one or more tag suffix strings.
 * Returns null if the value should be skipped entirely.
 *
 * Rules applied in order:
 *  1. "—" or empty → skip
 *  2. "(not listed..." → skip (no useful value before the paren)
 *  3. Strip leading "→ " (Merged split markers)
 *  4. Strip bracketed notes  [...] (e.g., "[merged: $75/mo]")
 *  5. Strip from first "("   (parenthetical notes like "($1,500/mo...)")
 *  6. Split on " + "         (multi-value cells)
 *  7. Normalize: spaces→_, /→_, &→and, remove remaining special chars
 */
function toTagValues(raw: string): string[] | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed || trimmed === '—') return null;
  if (trimmed.startsWith('(not listed')) return null;

  let val = trimmed
    .replace(/^→\s*/, '')           // strip "→ " prefix
    .replace(/\[.*?\]/g, '')        // strip [bracketed notes]
    .replace(/\(.*$/s, '')          // strip from "(" to end (parenthetical notes)
    .trim();

  if (!val || val === '—') return null;

  const parts = val.split(/\s*\+\s*/);

  const cleaned = parts
    .map(p => p.trim()
      .replace(/\s+/g, '_')
      .replace(/\//g, '_')
      .replace(/&/g, 'and')
      .replace(/'/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, ''),
    )
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : null;
}

// ── Finders ───────────────────────────────────────────────────────────────────

function findBudgetItem(db: ReturnType<typeof getDb>, category: string, name: string) {
  return db.prepare(`
    SELECT bi.budget_item_id AS id
    FROM budget_items bi
    JOIN budget_categories bc ON bc.category_id = bi.category_id
    WHERE bc.name = ? AND bi.name = ?
  `).get(category, name) as { id: string } | undefined;
}

function findRecurringItem(db: ReturnType<typeof getDb>, name: string) {
  return db.prepare(`
    SELECT recurring_item_id AS id FROM recurring_items
    WHERE lower(name) = lower(?) AND is_active = 1
    LIMIT 1
  `).get(name) as { id: string } | undefined;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [entityType, csvPath] = process.argv.slice(2);

if (!entityType || !csvPath || !['budget-item', 'recurring'].includes(entityType)) {
  console.error('Usage: tsx tag-from-csv.ts <budget-item|recurring> <csv-path>');
  process.exit(1);
}

const db = getDb();

const insertTag = db.prepare(`
  INSERT OR IGNORE INTO tags (tag_id, entity_type, entity_id, tag_name)
  VALUES (?, ?, ?, ?)
`);

const dbEntityType = entityType === 'budget-item' ? 'budget_item' : 'recurring_item';

const rows = parse(fs.readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as Record<string, string>[];

let tagged = 0, skipped = 0, notFound = 0;

for (const row of rows) {
  // For budget items use Budget Item column; for recurring items prefer Name column.
  // Use || not ?? so empty strings fall through to the next option.
  const name = entityType === 'budget-item'
    ? (row['Budget Item'] || row['Name'] || '')
    : (row['Name'] || row['Recurring Item'] || '');
  const category = row['Category'] || '';

  // Skip subtotals, totals, and rows with no entity name
  if (!name || /SUBTOTAL|^TOTAL$/i.test(name)) { skipped++; continue; }

  // Find the entity
  let entity: { id: string } | undefined;
  if (entityType === 'budget-item') {
    entity = findBudgetItem(db, category, name);
  } else {
    entity = findRecurringItem(db, name);
  }

  if (!entity) {
    console.warn(`  NOT FOUND: "${category ? category + ' / ' : ''}${name}"`);
    notFound++;
    continue;
  }

  // Build and insert tags from Maureen, Nick, Merged columns
  const tagSets: [string, string][] = [
    ['Maureen', row['Maureen'] ?? ''],
    ['Nick',    row['Nick']    ?? ''],
    ['Merged',  row['Merged']  ?? ''],
  ];

  const addedTags: string[] = [];
  for (const [prefix, raw] of tagSets) {
    const values = toTagValues(raw);
    if (!values) continue;
    for (const v of values) {
      const tag = `${prefix}:${v}`;
      insertTag.run(randomUUID(), dbEntityType, entity.id, tag);
      addedTags.push(tag);
    }
  }

  console.log(`  ✓ ${name}${category ? ` (${category})` : ''}: ${addedTags.join(', ')}`);
  tagged++;
}

db.close();
console.log(`\nDone — tagged: ${tagged}, skipped: ${skipped}, not found: ${notFound}`);
