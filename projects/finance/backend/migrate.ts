// CLI entrypoint: applies any pending migrations and exits.
// Usage: npm run db:migrate
import { getDb } from './db.js';

const db = getDb();
console.log('Database ready:', db.name);
