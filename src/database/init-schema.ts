import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity.js';
import { CategoryOrmEntity } from '../modules/categories/infrastructure/persistence/entities/category.orm-entity.js';
import { ProductOrmEntity } from '../modules/products/infrastructure/persistence/entities/product.orm-entity.js';
import { ProductPhotoOrmEntity } from '../modules/products/infrastructure/persistence/entities/product-photo.orm-entity.js';
import { InventoryOrmEntity } from '../modules/inventory/infrastructure/persistence/entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from '../modules/inventory/infrastructure/persistence/entities/inventory-movement.orm-entity.js';
import { CartOrmEntity } from '../modules/cart/infrastructure/persistence/entities/cart.orm-entity.js';
import { CartItemOrmEntity } from '../modules/cart/infrastructure/persistence/entities/cart-item.orm-entity.js';
import { OrderOrmEntity } from '../modules/orders/infrastructure/persistence/entities/order.orm-entity.js';
import { OrderItemOrmEntity } from '../modules/orders/infrastructure/persistence/entities/order-item.orm-entity.js';
import { OrderInventoryReservationOrmEntity } from '../modules/orders/infrastructure/persistence/entities/order-inventory-reservation.orm-entity.js';
import { NotificationOrmEntity } from '../modules/notifications/infrastructure/persistence/entities/notification.orm-entity.js';

async function initializeSchema(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'ecommerce',
    synchronize: false,
    entities: [
      User,
      CategoryOrmEntity,
      ProductOrmEntity,
      ProductPhotoOrmEntity,
      InventoryOrmEntity,
      InventoryMovementOrmEntity,
      CartOrmEntity,
      CartItemOrmEntity,
      OrderOrmEntity,
      OrderItemOrmEntity,
      OrderInventoryReservationOrmEntity,
      NotificationOrmEntity,
    ],
  });
  await dataSource.initialize();
  try {
    const [row]: Array<{ count: string }> = await dataSource.query(
      "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'",
    );
    if (Number(row.count) === 0) {
      // Initialize only an empty database; never synchronize an existing schema.
      await dataSource.synchronize();
      console.log('Initialized the empty ecommerce database.');
    } else {
      const tables: Array<{ tablename: string }> = await dataSource.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      );
      const existing = new Set(tables.map((table) => table.tablename));
      const missing = dataSource.entityMetadatas
        .map((entity) => entity.tableName)
        .filter(
          (name) =>
            name !== 'order_inventory_reservations' && !existing.has(name),
        );
      if (missing.length)
        throw new Error(
          `Existing database is missing tables: ${missing.join(', ')}. Apply its migrations before starting the app.`,
        );
      await dataSource.query(`CREATE TABLE IF NOT EXISTS order_inventory_reservations (
        order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        reservation_id VARCHAR(128) NOT NULL UNIQUE
      )`);
      console.log(
        'Preserved the existing schema and ensured the warehouse reservation mapping table exists.',
      );
    }
    await dataSource.query(readFileSync(new URL('./migrations/20261109-performance.sql', import.meta.url), 'utf8'));
    console.log('Ensured performance indexes and the catalog revision table exist.');
  } finally {
    await dataSource.destroy();
  }
}

initializeSchema().catch((error: unknown) => {
  console.error(
    'Database initialization failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});
