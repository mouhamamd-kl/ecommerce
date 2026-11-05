import { OrderTransactionContext } from './order-transaction-context.js';

export interface InventoryStock {
  productId: number;
  quantityOnHand: number;
  quantityReserved: number;
}

export interface InventoryReservationItem {
  productId: number;
  quantity: number;
}

export interface InventoryPort {
  /** ORM locks rows; remote snapshots are revalidated by atomic reserve. */
  findByProductIdsForUpdate(
    transaction: OrderTransactionContext,
    productIds: number[],
  ): Promise<InventoryStock[]>;

  reserve(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void>;

  releaseReservation(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void>;

  fulfillReservation(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void>;
}

export const INVENTORY = Symbol('INVENTORY');
