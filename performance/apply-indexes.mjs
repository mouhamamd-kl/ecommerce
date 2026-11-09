import pg from 'pg';
import { readFileSync } from 'node:fs';
process.loadEnvFile('.env');
const db = new pg.Client({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD, database: 'ecommerce_performance' });
await db.connect();
try {
  if ((await db.query('SELECT current_database() AS name')).rows[0].name !== 'ecommerce_performance') throw new Error('Expected the isolated benchmark database.');
  await db.query(readFileSync(new URL('../src/database/migrations/20261109-performance.sql', import.meta.url), 'utf8'));
  await db.query('ANALYZE');
  console.log('Applied performance indexes to ecommerce_performance.');
} finally { await db.end(); }
