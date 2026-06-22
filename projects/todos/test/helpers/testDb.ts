import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Babel transforms ESM → CJS for Jest, so __dirname is available here.
const MIGRATIONS_DIR = path.join(__dirname, '../../db/migrations');

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  return db;
}
