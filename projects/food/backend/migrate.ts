import { getDb } from './db.js';

const db = getDb();
console.log('Food database ready:', db.name);
