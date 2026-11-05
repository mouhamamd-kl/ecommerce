export class CartNotFoundError extends Error {
  constructor(userId: number) {
    super(`Cart for user ${userId} was not found`);
    this.name = 'CartNotFoundError';
  }
}