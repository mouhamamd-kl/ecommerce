export class InvalidProductCategoriesError extends Error {
  constructor() {
    super('One or more categories are invalid or inactive');
    this.name = 'InvalidProductCategoriesError';
  }
}