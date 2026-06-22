// CLI entrypoint: applies any pending migrations and exits.
// Usage: npm run todos:db:migrate
import { getDb } from './db.js';

const db = getDb();
console.log('Todos database ready:', db.name);
