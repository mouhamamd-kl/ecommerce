export class CategoryNameConflictError extends Error {
  constructor() {
    super('A category with this name already exists');
    this.name = 'CategoryNameConflictError';
  }
}