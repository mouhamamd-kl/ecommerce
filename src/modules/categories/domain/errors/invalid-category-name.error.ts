export class InvalidCategoryNameError extends Error {
  constructor() {
    super('Category name must contain between 2 and 100 characters');
    this.name = 'InvalidCategoryNameError';
  }
}