-- Generic tagging layer; extensible to any entity type.
CREATE TABLE IF NOT EXISTS tags (
  tag_id      TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,   -- 'recurring_item' | 'transaction' | 'account' | ...
  entity_id   TEXT NOT NULL,
  tag_name    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (entity_type, entity_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tags_name   ON tags (entity_type, tag_name);
