-- Durable cache generation: incremented in the same transaction as catalog writes.
CREATE TABLE IF NOT EXISTS catalog_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision BIGINT NOT NULL DEFAULT 0
);
INSERT INTO catalog_revision (id, revision) VALUES (1, 0) ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON orders (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created
  ON orders (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_products_active_id
  ON products (id DESC) WHERE "isActive" = true;
