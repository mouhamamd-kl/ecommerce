import pg from 'pg';
import bcrypt from 'bcrypt';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

process.loadEnvFile('.env');
const output = new URL('../performance-results/', import.meta.url);
mkdirSync(output, { recursive: true });
const settings = {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD,
};
const admin = new pg.Client({ ...settings, database: 'postgres' });
await admin.connect();
if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname='ecommerce_performance'")).rowCount) {
  await admin.query('CREATE DATABASE ecommerce_performance');
}
await admin.end();
execFileSync('docker', ['compose', '-f', 'docker-compose.yml', 'run', '--rm', '-T', '-e', 'DB_DATABASE=ecommerce_performance', 'init'], { stdio: 'inherit' });
const warehouseEnv = parseEnv(readFileSync(new URL('../../warehouse-service/.env', import.meta.url), 'utf8'));
const warehouseAdmin = new pg.Client({ connectionString: warehouseEnv.DATABASE_URL.replace('/warehouse_db?', '/postgres?') });
await warehouseAdmin.connect();
if (!(await warehouseAdmin.query("SELECT 1 FROM pg_database WHERE datname='warehouse_performance'")).rowCount) {
  await warehouseAdmin.query('CREATE DATABASE warehouse_performance');
}
await warehouseAdmin.end();
execFileSync('docker', ['compose', '-f', '../warehouse-service/docker-compose.yml', 'run', '--rm', '-T', '-e', 'PGDATABASE=warehouse_performance', 'migrate'], { stdio: 'inherit' });

const db = new pg.Client({ ...settings, database: 'ecommerce_performance' });
await db.connect();
try {
  await db.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
  await db.query('BEGIN');
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
  const customerHash = await bcrypt.hash(process.env.SEED_CUSTOMER_PASSWORD, 12);
  await db.query(`INSERT INTO "user" (id,email,password,role) VALUES (1,'admin@example.com',$1,'admin') ON CONFLICT DO NOTHING`, [adminHash]);
  await db.query(`INSERT INTO "user" (id,email,password,role)
    SELECT 1000+n, 'perf-user-'||lpad(n::text,5,'0')||'@example.test', $1, 'customer'
    FROM generate_series(1,10000) n ON CONFLICT DO NOTHING`, [customerHash]);
  await db.query(`INSERT INTO category (id,name,"isActive") SELECT n,'Benchmark category '||n,true FROM generate_series(1,10) n ON CONFLICT DO NOTHING`);
  await db.query(`INSERT INTO products (id,name,price,"isActive") SELECT n,'Benchmark product '||lpad(n::text,4,'0'), 10+n::numeric/10,true FROM generate_series(1,200) n ON CONFLICT DO NOTHING`);
  await db.query(`INSERT INTO product_categories (product_id,category_id) SELECT n,1+(n%10) FROM generate_series(1,200) n ON CONFLICT DO NOTHING`);
  await db.query(`INSERT INTO product_photos (product_id,url,is_primary,sort_order)
    SELECT n,'https://example.test/benchmark/'||n||'/'||p||'.jpg',p=1,p-1 FROM generate_series(1,200) n CROSS JOIN generate_series(1,2) p
    WHERE NOT EXISTS (SELECT 1 FROM product_photos WHERE product_id=n AND sort_order=p-1)`);
  await db.query(`INSERT INTO orders (id,user_id,status,payment_status,payment_method,total,shipping_address,admin_note,created_at,updated_at)
    SELECT n,1001+((n-1)%10000),'delivered','paid','cash_on_delivery',2*(10+(1+(n%200))::numeric/10),
      'Synthetic benchmark address','performance-seed:v1',timestamp '2026-01-01'+n*interval '1 second',timestamp '2026-01-01'+n*interval '1 second'
    FROM generate_series(1,200000) n ON CONFLICT DO NOTHING`);
  await db.query(`INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity,subtotal)
    SELECT o.id,p.id,p.name,p.price,1,p.price FROM orders o JOIN products p ON p.id=1+(o.id%200) CROSS JOIN generate_series(1,2) copy
    WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id=o.id)`);
  for (const table of ['user','category','products','product_photos','orders','order_items']) {
    await db.query(`SELECT setval(pg_get_serial_sequence($1,'id'),(SELECT max(id) FROM "${table}"))`, [table]);
  }
  await db.query('COMMIT');
  await db.query('ANALYZE');
  if (process.argv.includes('--baseline')) {
    if ((await db.query('SELECT current_database() AS name')).rows[0].name !== 'ecommerce_performance') throw new Error('Expected the isolated benchmark database.');
    await db.query('DROP INDEX IF EXISTS idx_orders_customer_created, idx_orders_created, idx_order_items_order, idx_products_active_id');
    console.log('Removed only the four performance indexes from the isolated database for the baseline.');
  }
  const counts = (await db.query(`SELECT (SELECT count(*) FROM orders)::int orders,(SELECT count(*) FROM order_items)::int order_items,(SELECT count(*) FROM products)::int products,(SELECT count(*) FROM "user")::int users`)).rows[0];
  writeFileSync(new URL('dataset.json', output), JSON.stringify({ createdAt: new Date().toISOString(), database: 'ecommerce_performance', ...counts }, null, 2));
  console.log('Benchmark database ready:', counts);
} catch (error) {
  await db.query('ROLLBACK'); throw error;
} finally { await db.end(); }
const warehouse = new pg.Client({ connectionString: warehouseEnv.DATABASE_URL.replace('/warehouse_db?', '/warehouse_performance?') });
await warehouse.connect();
try {
  await warehouse.query(`INSERT INTO inventory (product_id,quantity_on_hand,quantity_reserved,low_stock_threshold) SELECT n,10000,0,5 FROM generate_series(1,200) n ON CONFLICT (product_id) DO NOTHING`);
  await warehouse.query('ANALYZE');
} finally { await warehouse.end(); }
console.log('Warehouse benchmark database ready. Existing demo databases are unchanged.');
