-- Apply to the ecommerce database before enabling INVENTORY_DRIVER=grpc.
CREATE TABLE IF NOT EXISTS order_inventory_reservations (
    order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    reservation_id VARCHAR(128) NOT NULL UNIQUE
);
