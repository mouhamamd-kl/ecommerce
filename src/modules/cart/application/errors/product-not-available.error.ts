export class ProductNotAvailableError extends Error {
  constructor(productId: number) {
    super(`Product ${productId} is not available`);
    this.name = 'ProductNotAvailableError';
  }
}