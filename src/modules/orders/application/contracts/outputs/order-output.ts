import { OrderStatusType } from '../../../domain/enums/order-status.js';

import { PaymentStatusType } from '../../../domain/enums/payment-status.js';

import { PaymentMethodType } from '../../../domain/enums/payment-method.js';

import { OrderItemOutput } from './order-item-output.js';

export interface OrderOutput {
  id: number;
  userId: number;

  items: OrderItemOutput[];

  status: OrderStatusType;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;

  total: number;

  shippingAddress: string;
  adminNote: string | null;

  createdAt: Date;
  updatedAt: Date;
}