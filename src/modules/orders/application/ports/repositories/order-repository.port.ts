import { Order } from '../../../domain/entities/order.entity.js';
import { OrderTransactionContext } from '../services/order-transaction-context.js';

export interface OrderRepositoryPort {
  findAll(): Promise<Order[]>;

  findAllForCustomer(customerId: number): Promise<Order[]>;

  findById(id: number): Promise<Order | null>;

  findByIdForCustomer(
    customerId: number,
    orderId: number,
  ): Promise<Order | null>;

  findByIdForUpdate(
    transaction: OrderTransactionContext,
    orderId: number,
  ): Promise<Order | null>;

  findByIdForCustomerUpdate(
    transaction: OrderTransactionContext,
    customerId: number,
    orderId: number,
  ): Promise<Order | null>;

  save(
    transaction: OrderTransactionContext,
    order: Order,
  ): Promise<Order>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');