-- Migration 006: per-item store + item detail for the shopping list table view.
-- item_detail is JSON-encoded: { source: 'walmart' | 'free_text', itemId?, name?,
-- imageUrl?, price?, packCount? } so a selected Walmart product's thumbnail/title
-- can be displayed without re-searching every time the list is opened.

ALTER TABLE shopping_list_items ADD COLUMN store TEXT;
ALTER TABLE shopping_list_items ADD COLUMN item_detail TEXT;
