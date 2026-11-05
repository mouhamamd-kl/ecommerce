export class ProductNotFoundError extends Error {
  constructor(id: number) {
    super(`Product with ID ${id} was not found`);
    this.name = 'ProductNotFoundError';
  }
}