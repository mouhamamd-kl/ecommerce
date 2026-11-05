export interface AdjustStockInput {
  productId: number;
  operation: 'add' | 'remove';
  quantity: number;
  reason: string;
}
