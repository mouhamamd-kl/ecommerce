export class InventoryNotFoundError extends Error {
  constructor(productId: number) {
    super(`Inventory for product ${productId} was not found`);
    this.name = 'InventoryNotFoundError';
  }
}
