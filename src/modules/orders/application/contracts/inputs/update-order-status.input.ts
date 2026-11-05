import { OrderStatusType } from '../../../domain/enums/order-status.js';

export interface UpdateOrderStatusInput {
  orderId: number;
  status: OrderStatusType;
  adminNote?: string | null;
}