export interface ProductInventorySnapshot {
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface ProductInventoryPort {
  findByProductId(productId: number): Promise<ProductInventorySnapshot | null>;
}

export const PRODUCT_INVENTORY = Symbol('PRODUCT_INVENTORY');
