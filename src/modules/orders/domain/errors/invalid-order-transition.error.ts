import { OrderStatusType } from '../enums/order-status.js';

export class InvalidOrderTransitionError extends Error {
  constructor(
    currentStatus: OrderStatusType,
    requestedStatus: OrderStatusType,
  ) {
    super(
      `Cannot change order status from "${currentStatus}" to "${requestedStatus}".`,
    );

    this.name = 'InvalidOrderTransitionError';

    Object.setPrototypeOf(
      this,
      InvalidOrderTransitionError.prototype,
    );
  }
}