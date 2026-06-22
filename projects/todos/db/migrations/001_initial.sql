-- Migration 001: initial schema
-- Todos project — SQLite via better-sqlite3

CREATE TABLE todos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
