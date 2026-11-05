export interface CreateInventoryInput {
  productId: number;
  quantityOnHand?: number;
  lowStockThreshold?: number;
}
