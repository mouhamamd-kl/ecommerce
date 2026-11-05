export const InventoryMovementType = {
  stockAdded: 'stock_added',
  stockRemoved: 'stock_removed',
  reserved: 'reserved',
  released: 'released',
  sold: 'sold',
} as const;

export type InventoryMovementTypeValue =
  (typeof InventoryMovementType)[keyof typeof InventoryMovementType];
