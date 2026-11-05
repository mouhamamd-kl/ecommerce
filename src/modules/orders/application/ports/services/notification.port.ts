import { OrderOutput } from '../../contracts/outputs/order-output.js';

export interface NotificationPort {
  notifyOrderCreated(order: OrderOutput): Promise<void>;

  notifyOrderStatusChanged(order: OrderOutput): Promise<void>;
}

export const ORDER_NOTIFICATION = Symbol('ORDER_NOTIFICATION');