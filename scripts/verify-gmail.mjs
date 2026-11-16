// Explicitly sends ONE real order confirmation to the configured Gmail account.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import amqp from 'amqplib';
import { emailTransport } from '../dist/async-events/email-delivery.js';
import { MQ } from '../dist/async-events/rabbitmq.js';

process.loadEnvFile('.env');
assert.ok(process.env.SMTP_USER && process.env.SMTP_PASSWORD, 'Fill SMTP_USER and SMTP_PASSWORD in .env.');
const mail = emailTransport({ ...process.env, EMAIL_TRANSPORT: 'smtp' });
try { await mail.transport.verify(); console.log('Gmail SMTP authentication and TLS verified.'); }
catch { throw new Error('Gmail SMTP verification failed. Check host, port, address, and app password; credentials were not logged.'); }
finally { mail.transport.close(); }
const db = new pg.Client({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || 'ecommerce' });
const api = async (path, { token, method = 'GET', body } = {}) => {
  const response = await fetch('http://127.0.0.1:3000/api/v1' + path, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return (await response.json()).data;
};
const compose = () => execFileSync('docker', ['compose', 'up', '-d', '--no-deps', '--wait', 'email-worker'],
  { env: { ...process.env, EMAIL_TRANSPORT: 'smtp' }, stdio: 'pipe', timeout: 90000 });
let customer, order;
await db.connect();
try {
  assert.equal((await db.query("SELECT count(*)::int count FROM order_outbox WHERE kind='email' AND published_at IS NULL")).rows[0].count, 0,
    'Finish pending local email jobs before switching the worker to Gmail.');
  const broker = await amqp.connect(process.env.RABBITMQ_URL);
  try {
    const channel = await broker.createChannel();
    for (const name of [MQ.queue, MQ.retryQueue]) assert.equal((await channel.checkQueue(name)).messageCount, 0,
      'Finish pending local email jobs before switching the worker to Gmail.');
  } finally { await broker.close(); }
  const admin = (await api('/auth/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD } })).access_token;
  const [local, domain] = process.env.SMTP_USER.split('@');
  assert.ok(local && domain, 'SMTP_USER must be a full Gmail/Google Workspace email address.');
  // A Gmail plus alias reaches the configured account and avoids modifying existing users.
  const recipient = `${local.split('+')[0]}+req4-proof@${domain}`;
  assert.ok(process.env.SEED_CUSTOMER_PASSWORD, 'Configure SEED_CUSTOMER_PASSWORD for the local proof account.');
  const existing = await db.query('SELECT id FROM "user" WHERE email=$1', [recipient]);
  customer = (await api(existing.rowCount ? '/auth/customer/login' : '/auth/customer/register', {
    method: 'POST', body: { email: recipient, password: process.env.SEED_CUSTOMER_PASSWORD },
  })).access_token;
  const inventory = await api('/admin/inventory', { token: admin });
  const product = inventory.find(item => item.availableQuantity > 0 && item.product?.isActive);
  assert.ok(product, 'Need an active product with available stock.');
  compose();
  await api('/cart/items', { token: customer, method: 'POST', body: { productId: product.productId, quantity: 1 } });
  order = await api('/orders', { token: customer, method: 'POST', body: { shippingAddress: 'Requirement four Gmail proof', paymentMethod: 'cash_on_delivery' } });
  let receipt;
  for (let i = 0; i < 90; i++) {
    receipt = (await db.query('SELECT event_id, sent_at, provider_message_id FROM order_email_deliveries WHERE order_id=$1', [order.id])).rows[0];
    if (receipt) break;
    await sleep(1000);
  }
  assert.ok(receipt, 'No SMTP acceptance recorded. Inspect email-worker logs and the retry/DLQ queues.');
  mkdirSync('async-results', { recursive: true });
  writeFileSync('async-results/gmail-proof.json', JSON.stringify({ createdAt: new Date().toISOString(), orderId: order.id,
    provider: 'Gmail SMTP', recipient: `${local[0]}***@${domain}`, providerAccepted: true, ...receipt }, null, 2));
  console.log(`PASS: Gmail accepted the worker's real confirmation for order #${order.id}. Check your Gmail inbox/spam for this order number.`);
} finally {
  if (order && customer) await api(`/orders/${order.id}/cancel`, { token: customer, method: 'PATCH' });
  await db.end();
}
