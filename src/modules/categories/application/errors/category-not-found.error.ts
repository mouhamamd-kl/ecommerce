export class CategoryNotFoundError extends Error {
  constructor(id: number) {
    super(`Category with ID ${id} was not found`);
    this.name = 'CategoryNotFoundError';
  }
}