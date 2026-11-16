// Run only against the local Docker stack. Uses new test customers, never demo carts.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { EmailPublisher, MQ } from '../dist/async-events/rabbitmq.js';

process.loadEnvFile('.env');
const base = 'http://127.0.0.1:3000/api/v1';
const db = new pg.Client({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || 'ecommerce' });
const evidence = { createdAt: new Date().toISOString(), mailTransport: 'mailpit', checks: [] };
const pass = (name, details = {}) => { evidence.checks.push({ name, passed: true, ...details }); console.log(`PASS: ${name}`); };
const compose = (...args) => execFileSync('docker', ['compose', '-f', 'docker-compose.yml', ...args], { stdio: 'pipe', timeout: 120000 });
const workerMode = compose('exec', '-T', 'email-worker', 'node', '-e', 'console.log(process.env.EMAIL_TRANSPORT)').toString().trim();
assert.equal(workerMode, 'mailpit', 'This automated test requires EMAIL_TRANSPORT=mailpit; it must not send test emails externally.');
async function until(check, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await check(); if (value) return value; await sleep(300); }
  throw new Error(`Timed out: ${label}`);
}
async function request(path, { token, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(base + path, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: HTTP ${response.status}`);
  return result.data;
}
async function queue(name) {
  const response = await fetch(`http://127.0.0.1:15672/api/queues/%2F/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.RABBITMQ_USERNAME}:${process.env.RABBITMQ_PASSWORD}`).toString('base64')}` },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return null;
  return response.json();
}
async function socket(token) {
  const config = await request('/realtime/config', { token });
  const ws = new WebSocket(`ws://${config.host}:${config.port}/app/${config.key}?protocol=7&client=verification&version=1.0`);
  const messages = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (typeof message.data === 'string') { try { message.data = JSON.parse(message.data); } catch {} }
    if (message.event === 'pusher:ping') ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
    messages.push(message);
  });
  const next = (event, predicate = () => true) => until(() => {
    const index = messages.findIndex(message => message.event === event && predicate(message));
    return index < 0 ? null : messages.splice(index, 1)[0];
  }, `WebSocket ${event}`, 20000);
  const connected = await next('pusher:connection_established');
  return { ws, next, async subscribe(channel) {
    const auth = await request('/realtime/auth', { token, method: 'POST', body: { socket_id: connected.data.socket_id, channel_name: channel } });
    ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel, auth: auth.auth } }));
    await next('pusher_internal:subscription_succeeded', message => message.channel === channel);
  } };
}
let admin, customer;
let workerStopped = false, smtpStopped = false;
const orders = [], sockets = [];
await db.connect();
try {
  admin = (await request('/auth/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD } })).access_token;
  const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  const password = randomBytes(20).toString('hex');
  customer = (await request('/auth/customer/register', { method: 'POST', status: 201,
    body: { email: `async-owner-${suffix}@example.test`, password } })).access_token;
  const other = (await request('/auth/customer/register', { method: 'POST', status: 201,
    body: { email: `async-other-${suffix}@example.test`, password } })).access_token;
  const inventory = await request('/admin/inventory', { token: admin });
  const product = inventory.find(item => item.availableQuantity >= 4 && item.product?.isActive);
  assert.ok(product, 'Need one active product with at least four available units.');
  const create = async () => {
    await request('/cart/items', { token: customer, method: 'POST', status: 201, body: { productId: product.productId, quantity: 1 } });
    const start = Date.now();
    const order = await request('/orders', { token: customer, method: 'POST', status: 201,
      body: { shippingAddress: 'Requirement four automated verification', paymentMethod: 'cash_on_delivery' } });
    orders.push(order);
    return { order, responseMs: Date.now() - start };
  };
  const delivered = async id => (await db.query('SELECT event_id FROM order_email_deliveries WHERE order_id=$1', [id])).rowCount > 0;
  const adminSocket = await socket(admin); sockets.push(adminSocket);
  await adminSocket.subscribe('private-admin.orders');

  compose('stop', 'email-worker'); workerStopped = true;
  const first = await create();
  const start = Date.now();
  await adminSocket.next('order.created', message => message.data.orderId === first.order.id);
  pass('checkout returns and admin receives the new order while the email worker is stopped', { orderId: first.order.id, responseMs: first.responseMs, eventWaitMs: Date.now() - start });
  await until(async () => (await queue(MQ.queue))?.messages_ready >= 1, 'confirmation waiting in durable RabbitMQ queue');
  assert.equal(await delivered(first.order.id), false);
  pass('the stopped worker leaves the confirmation queued without acknowledging it');

  const authorization = { method: 'POST', body: { socket_id: '123.456', channel_name: `private-orders.${first.order.id}` } };
  await request('/realtime/auth', { ...authorization, status: 401 });
  await request('/realtime/auth', { ...authorization, token: 'invalid-token', status: 401 });
  await request('/realtime/auth', { ...authorization, token: other, status: 403 });
  await request('/realtime/auth', { ...authorization, token: admin, status: 403 });
  await request('/realtime/auth', { ...authorization, token: customer, body: { ...authorization.body, channel_name: 'private-admin.orders' }, status: 403 });
  pass('anonymous, invalid-token, other-customer, and wrong-role subscriptions are rejected');

  const customerSocket = await socket(customer); sockets.push(customerSocket);
  await customerSocket.subscribe(`private-orders.${first.order.id}`);
  const changedAt = Date.now();
  await request(`/admin/orders/${first.order.id}/status`, { token: admin, method: 'PATCH', body: { status: 'confirmed' } });
  await customerSocket.next('order.updated', message => message.data.orderId === first.order.id && message.data.status === 'confirmed');
  pass('the owning customer receives administrator approval over its private WebSocket channel', { updateMs: Date.now() - changedAt });

  // Restarting the broker also verifies that the durable queue has disk-backed state.
  compose('restart', 'rabbitmq');
  await until(async () => { try { return (await queue(MQ.queue))?.messages_ready >= 1; } catch { return false; } }, 'queued mail survives broker restart', 60000);
  compose('start', 'email-worker'); workerStopped = false;
  await until(() => delivered(first.order.id), 'mail delivered after worker restart', 45000);
  pass('worker restart delivers the queued email; broker restart preserves it too');

  const [captured] = (await db.query("SELECT id, payload FROM order_outbox WHERE kind='email' AND payload->>'orderId'=$1", [String(first.order.id)])).rows;
  const publisher = new EmailPublisher(process.env.RABBITMQ_URL, Number(process.env.EMAIL_RETRY_DELAY_MS || 5000));
  try { await publisher.publish(captured.id, captured.payload); } finally { await publisher.close(); }
  await sleep(2000);
  assert.equal((await db.query('SELECT count(*)::int count FROM order_email_deliveries WHERE order_id=$1', [first.order.id])).rows[0].count, 1);
  const inbox = await (await fetch('http://127.0.0.1:8025/api/v1/messages?limit=500')).json();
  assert.equal(inbox.messages.filter(message => message.Subject === `BARAKAH — order #${first.order.id} received`).length, 1);
  pass('redelivery of an already recorded event does not send another email');

  compose('stop', 'mailpit'); smtpStopped = true;
  const temporary = await create();
  await until(async () => (await queue(MQ.retryQueue))?.messages_ready >= 1, 'temporary SMTP error enters delayed retry', 30000);
  compose('start', 'mailpit'); smtpStopped = false;
  await until(() => delivered(temporary.order.id), 'retry succeeds after SMTP recovers', 45000);
  pass('temporary SMTP failure retries through the delayed queue and succeeds after recovery');

  const deadBefore = (await queue(MQ.deadQueue))?.messages || 0;
  compose('stop', 'mailpit'); smtpStopped = true;
  const permanent = await create();
  await until(async () => (await queue(MQ.deadQueue))?.messages > deadBefore, 'exhausted SMTP retries enter DLQ', 90000);
  assert.equal(await delivered(permanent.order.id), false);
  pass('exhausted retries move the failed confirmation to the dead-letter queue', { orderId: permanent.order.id, maxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS || 4) });
  compose('start', 'mailpit'); smtpStopped = false;
  const healthy = await create();
  await until(() => delivered(healthy.order.id), 'healthy mail is not blocked by a dead-lettered job', 30000);
  pass('a failed message does not block later healthy confirmation emails');
} finally {
  if (smtpStopped) compose('start', 'mailpit');
  if (workerStopped) compose('start', 'email-worker');
  for (const connection of sockets) connection.ws.close();
  for (const order of orders) {
    try { await request(`/orders/${order.id}/cancel`, { token: customer, method: 'PATCH' }); }
    catch { console.warn(`Test order #${order.id} may need manual cancellation.`); }
  }
  await db.end();
  mkdirSync('async-results', { recursive: true });
  writeFileSync('async-results/verification.json', JSON.stringify(evidence, null, 2));
}
