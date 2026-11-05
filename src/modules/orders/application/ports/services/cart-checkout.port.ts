import { OrderTransactionContext } from './order-transaction-context.js';

export interface CartCheckoutItem {
  productId: number;
  quantity: number;
}

export interface CartCheckoutPort {
  getItemsForCheckout(
    transaction: OrderTransactionContext,
    customerId: number,
  ): Promise<CartCheckoutItem[]>;

  clearCart(
    transaction: OrderTransactionContext,
    customerId: number,
  ): Promise<void>;
}

export const CART_CHECKOUT = Symbol('CART_CHECKOUT');