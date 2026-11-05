export class CartItemNotFoundError extends Error {
  constructor(itemId: number) {
    super(`Cart item ${itemId} was not found`);
    this.name = 'CartItemNotFoundError';
  }
}