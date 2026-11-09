import bcrypt from 'bcrypt';
import pg from 'pg';

// Seed the running API so inventory goes through the configured backend.
// The older ORM seeder also creates a pending order with local reservations.
const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}/api/v1`;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
if (!adminPassword || !customerPassword) {
  throw new Error('Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD in .env first.');
}

const db = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'ecommerce',
});
await db.connect();
try {
  for (const [email, role, password] of [
    ['admin@example.com', 'admin', adminPassword],
    ['alice@example.com', 'customer', customerPassword],
    ['bob@example.com', 'customer', customerPassword],
  ]) {
    await db.query(
      'INSERT INTO "user" (email, password, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [email, await bcrypt.hash(password, 12), role],
    );
  }
} finally {
  await db.end();
}

async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path}: HTTP ${response.status}: ${JSON.stringify(result.message)}`);
  }
  return result.data;
}

const { access_token: token } = await api('/auth/admin/login', {
  method: 'POST', body: { email: 'admin@example.com', password: adminPassword },
});
const categories = await api('/admin/categories', { token });
for (const name of ['Electronics', 'Clothing', 'Home & Kitchen', 'Books']) {
  if (!categories.some(category => category.name === name)) {
    categories.push(await api('/admin/categories', { method: 'POST', token, body: { name } }));
  }
}

const samples = [
  ['Wireless Headphones', 59.99, 'Electronics', 'photo-1505740420928-5e560c06d30e'],
  ['Smart Watch', 89.99, 'Electronics', 'photo-1523275335684-37898b6baf30'],
  ['Classic T-Shirt', 19.99, 'Clothing', 'photo-1521572163474-6864f9cf17ab'],
  ['Coffee Maker', 44.99, 'Home & Kitchen', 'photo-1495474472287-4d71bcdd2085'],
  ['Everyday Backpack', 34.99, 'Clothing', 'photo-1553062407-98eeb64c6a62'],
  ['Programming Fundamentals', 29.99, 'Books', 'photo-1512820790803-83ca734da794'],
];
const products = await api('/admin/products', { token });
const inventories = await api('/admin/inventory', { token });
for (const [name, price, categoryName, photo] of samples) {
  let product = products.find(item => item.name === name);
  if (!product) {
    product = await api('/admin/products', {
      method: 'POST', token,
      body: {
        name, price,
        categoryIds: [categories.find(category => category.name === categoryName).id],
        photos: [{ url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=80`, isPrimary: true }],
      },
    });
    products.push(product);
  }
  if (!inventories.some(item => item.productId === product.id)) {
    inventories.push(await api('/admin/inventory', {
      method: 'POST', token,
      body: { productId: product.id, quantityOnHand: 30, lowStockThreshold: 5 },
    }));
  }
}

console.log('Local seed complete: 3 accounts, 4 sample categories, 6 sample products.');
console.log('Inventory initialized through the API; existing stock and passwords are preserved.');
console.log('Admin: admin@example.com / SEED_ADMIN_PASSWORD from .env');
console.log('Customers: alice@example.com or bob@example.com / SEED_CUSTOMER_PASSWORD from .env');
