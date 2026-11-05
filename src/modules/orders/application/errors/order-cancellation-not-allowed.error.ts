import { OrderStatusType } from '../../domain/enums/order-status.js';

export class OrderCancellationNotAllowedError extends Error {
  public readonly orderId: number;
  public readonly currentStatus: OrderStatusType;

  constructor(
    orderId: number,
    currentStatus: OrderStatusType,
  ) {
    super(
      `Order ${orderId} cannot be cancelled by the customer while its status is "${currentStatus}".`,
    );

    this.name = 'OrderCancellationNotAllowedError';

    this.orderId = orderId;
    this.currentStatus = currentStatus;

    Object.setPrototypeOf(
      this,
      OrderCancellationNotAllowedError.prototype,
    );
  }
}