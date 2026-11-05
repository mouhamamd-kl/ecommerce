export class InvalidCartItemQuantityError extends Error {
  constructor(quantity: number) {
    super(`Invalid cart item quantity: ${quantity}`);
    this.name = 'InvalidCartItemQuantityError';
  }
}