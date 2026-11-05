export class OrderNotFoundError extends Error {
  constructor(orderId: number) {
    super(`Order with ID ${orderId} was not found.`);

    this.name = 'OrderNotFoundError';

    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}