import { OrderTransactionContext } from './order-transaction-context.js';

export interface OrderUnitOfWorkPort {
  execute<T>(
    work: (transaction: OrderTransactionContext) => Promise<T>,
  ): Promise<T>;
}

export const ORDER_UNIT_OF_WORK = Symbol('ORDER_UNIT_OF_WORK');