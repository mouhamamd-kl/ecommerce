export class InventoryAlreadyExistsError extends Error {
  constructor() {
    super('Inventory already exists for this product');
    this.name = 'InventoryAlreadyExistsError';
  }
}
