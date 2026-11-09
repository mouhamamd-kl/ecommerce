import assert from 'node:assert/strict';
import pg from 'pg';
import { createClient } from 'redis';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

process.loadEnvFile('.env');
const base = 'http://127.0.0.1:3001/api/v1';
const settings = { host: process.env.DB_HOST || 'localhost', user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD, database: 'ecommerce_performance' };
const primary = new pg.Client({ ...settings, port: Number(process.env.DB_PORT || 5432) });
const replica = new pg.Client({ ...settings, port: Number(process.env.DB_REPLICA_PORT || 5435) });
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', () => {});
const evidence = { createdAt: new Date().toISOString(), checks: [] };
const pass = (name, details = {}) => { evidence.checks.push({ name, passed: true, ...details }); console.log(`PASS: ${name}`); };
function docker(...args) { execFileSync('docker', ['compose', '-f', 'docker-compose.yml', ...args], { stdio: 'pipe' }); }
async function request(path, { method = 'GET', body, token, headers = {}, status = 200 } = {}) {
  const response = await fetch(base + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: HTTP ${response.status}: ${text.slice(0, 300)}`);
  return { response, text, data: text ? JSON.parse(text).data : null };
}
const login = async (role, email, password) => (await request(`/auth/${role}/login`, { method: 'POST', body: { email, password } })).data.access_token;
let admin, customer, original, createdOrder, pausedReplica = false, pausedRedis = false;
await primary.connect(); await replica.connect(); await redis.connect();
try {
  admin = await login('admin', 'admin@example.com', process.env.SEED_ADMIN_PASSWORD);
  customer = await login('customer', 'perf-user-00001@example.test', process.env.SEED_CUSTOMER_PASSWORD);
  await request('/admin/performance', { status: 401 });
  await request('/admin/performance', { token: customer, status: 401 });
  const info = (await request('/admin/performance', { token: admin })).data;
  assert.equal(info.redisReady, true);
  pass('performance diagnostics require an administrator');

  original = (await request('/products/1')).data;
  const cached = await request('/products/1');
  assert.equal(cached.response.headers.get('x-catalog-cache'), 'HIT');
  const oldEtag = cached.response.headers.get('etag');
  const unchanged = await request('/products/1', { headers: { 'If-None-Match': oldEtag }, status: 304 });
  assert.equal(unchanged.text.length, 0);
  assert.equal(unchanged.response.headers.get('cache-control'), 'public, no-cache');
  pass('warm Redis hit and HTTP 304 with an empty body', { etag: oldEtag, responseBytes: 0 });

  await request('/admin/products/1', { method: 'PATCH', token: admin, body: { name: 'Benchmark product updated immediately', price: original.price + 1 } });
  const updated = await request('/products/1', { headers: { 'If-None-Match': oldEtag } });
  assert.equal(updated.data.name, 'Benchmark product updated immediately');
  assert.notEqual(updated.response.headers.get('etag'), oldEtag);
  const list = await request('/products');
  assert.equal(list.data.find(product => product.id === 1).price, original.price + 1);
  pass('product update immediately invalidates detail and list caches and changes the ETag');

  assert.equal((await replica.query('SELECT pg_is_in_recovery() AS replica')).rows[0].replica, true);
  await assert.rejects(replica.query('UPDATE catalog_revision SET revision=revision WHERE id=1'), error => error.code === '25006');
  pass('physical streaming replica rejects writes');
  await replica.query('SELECT pg_wal_replay_pause()'); pausedReplica = true;
  await request('/admin/products/1', { method: 'PATCH', token: admin, body: { name: 'Visible while replica replay is paused' } });
  const fresh = await request('/products/1');
  assert.equal(fresh.data.name, 'Visible while replica replay is paused');
  assert.equal(fresh.response.headers.get('x-read-source'), 'primary');
  pass('paused replica falls back to primary and never returns the old product');

  await request('/cart', { method: 'DELETE', token: customer });
  const stockBefore = (await request('/admin/inventory/1', { token: admin })).data;
  await request('/cart/items', { method: 'POST', token: customer, body: { productId: 1, quantity: 1 }, status: 201 });
  createdOrder = (await request('/orders', { method: 'POST', token: customer, body: { shippingAddress: 'Requirement three integration verification', paymentMethod: 'cash_on_delivery' }, status: 201 })).data;
  const history = await request('/orders', { token: customer });
  assert.ok(history.data.some(order => order.id === createdOrder.id));
  assert.equal(history.response.headers.get('cache-control'), 'no-store');
  assert.equal(history.response.headers.get('etag'), null);
  const replicaOrder = (await replica.query('SELECT count(*)::int count FROM orders WHERE id=$1', [createdOrder.id])).rows[0].count;
  assert.equal(replicaOrder, 0);
  await request(`/orders/${createdOrder.id}/cancel`, { method: 'PATCH', token: customer }); createdOrder = null;
  const stockAfter = (await request('/admin/inventory/1', { token: admin })).data;
  assert.equal(stockAfter.quantityOnHand, stockBefore.quantityOnHand);
  assert.equal(stockAfter.quantityReserved, stockBefore.quantityReserved);
  pass('customer sees a newly created order before replica replay; private data is not cached; cancellation restores stock');
  await replica.query('SELECT pg_wal_replay_resume()'); pausedReplica = false;

  const beforeOutage = await request('/products/1');
  docker('pause', 'redis'); pausedRedis = true;
  await request('/admin/products/1', { method: 'PATCH', token: admin, body: { name: 'Updated during Redis outage' } });
  const duringOutage = await request('/products/1', { headers: { 'If-None-Match': beforeOutage.response.headers.get('etag') } });
  assert.equal(duringOutage.data.name, 'Updated during Redis outage');
  assert.equal(duringOutage.response.headers.get('x-catalog-cache'), 'BYPASS');
  docker('unpause', 'redis'); pausedRedis = false;
  await sleep(1500);
  const recovered = await request('/products/1');
  assert.equal(recovered.data.name, 'Updated during Redis outage');
  assert.equal((await request('/products/1')).response.headers.get('x-catalog-cache'), 'HIT');
  pass('Redis command timeout fails open and old cached data stays unreachable after recovery');

  await request('/admin/products/1', { method: 'PATCH', token: admin, body: { name: original.name, price: original.price } });
  const revision = (await primary.query('SELECT revision::text FROM catalog_revision WHERE id=1')).rows[0].revision;
  await request('/products/1');
  const key = `catalog:ecommerce_performance:v1:${revision}:product:1`;
  const ttlMs = await redis.pTTL(key);
  assert.ok(ttlMs > 0 && ttlMs <= 30000);
  console.log('Waiting for the real 30-second Redis TTL to expire...');
  await sleep(31000);
  assert.equal(await redis.exists(key), 0);
  const expired = await request('/products/1');
  assert.equal(expired.response.headers.get('x-catalog-cache'), 'MISS');
  pass('real 30-second TTL expiry removes the entry and the next request reloads it', { observedTtlMs: ttlMs });
  evidence.diagnostics = (await request('/admin/performance', { token: admin })).data;
} finally {
  if (pausedRedis) docker('unpause', 'redis');
  if (pausedReplica) await replica.query('SELECT pg_wal_replay_resume()');
  if (createdOrder) await request(`/orders/${createdOrder.id}/cancel`, { method: 'PATCH', token: customer });
  if (original && admin) await request('/admin/products/1', { method: 'PATCH', token: admin, body: { name: original.name, price: original.price } });
  await primary.end(); await replica.end(); if (redis.isOpen) redis.destroy();
  writeFileSync('performance-results/correctness.json', JSON.stringify(evidence, null, 2));
}
