export class InsufficientStockError extends Error {
  constructor(
    productId: number,
    requestedQuantity: number,
    availableQuantity: number,
  ) {
    super(
      `Cannot remove ${requestedQuantity} units: only ${availableQuantity} available for product ${productId}`,
    );
    this.name = 'InsufficientStockError';
  }
}
