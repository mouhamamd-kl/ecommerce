import { OrderTransactionContext } from './order-transaction-context.js';

export interface CheckoutProduct {
  id: number;
  name: string;
  price: number;
}

export interface ProductCatalogPort {
  findActiveByIds(
    transaction: OrderTransactionContext,
    productIds: number[],
  ): Promise<CheckoutProduct[]>;
}

export const PRODUCT_CATALOG = Symbol('PRODUCT_CATALOG');