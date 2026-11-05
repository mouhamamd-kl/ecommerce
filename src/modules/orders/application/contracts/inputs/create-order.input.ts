import { PaymentMethodType } from '../../../domain/enums/payment-method.js';

export interface CreateOrderInput {
  shippingAddress: string;
  paymentMethod: PaymentMethodType;
}