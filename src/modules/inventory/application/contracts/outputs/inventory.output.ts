export interface InventoryProductSummaryOutput {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
}

export interface InventoryOutput {
  id: number;
  productId: number;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
  availableQuantity: number;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: InventoryProductSummaryOutput | null;
}
