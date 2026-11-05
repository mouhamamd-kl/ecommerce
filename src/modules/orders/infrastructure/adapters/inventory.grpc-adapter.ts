import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import type {
  InventoryPort,
  InventoryReservationItem,
  InventoryStock,
} from '../../application/ports/services/inventory.port.js';
import type { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';
import { TypeOrmOrderTransactionContext } from '../persistence/typeorm-order-transaction-context.js';
import { OrderInventoryReservationOrmEntity } from '../persistence/entities/order-inventory-reservation.orm-entity.js';
import { WarehouseGrpcClient } from '../../../inventory/infrastructure/grpc/warehouse-grpc.client.js';
import {
  grpcErrorCode,
  isUncertainGrpcFailure,
  warehouseException,
} from '../../../inventory/infrastructure/grpc/warehouse-grpc.errors.js';
import type {
  ReserveStockRequest,
  WarehouseReservation,
} from '../../../inventory/infrastructure/grpc/warehouse-grpc.contract.js';

@Injectable()
export class InventoryGrpcAdapter implements InventoryPort {
  private readonly logger = new Logger(InventoryGrpcAdapter.name);

  constructor(
    @Inject(WarehouseGrpcClient) private readonly client: WarehouseGrpcClient,
  ) {}

  async findByProductIdsForUpdate(
    _transaction: OrderTransactionContext,
    productIds: number[],
  ): Promise<InventoryStock[]> {
    const result: InventoryStock[] = [];
    for (const productId of new Set(productIds)) {
      try {
        const item = await this.client.call('getInventory', { productId });
        result.push({
          productId: item.productId,
          quantityOnHand: item.quantityOnHand,
          quantityReserved: item.quantityReserved,
        });
      } catch (error) {
        if (grpcErrorCode(error) !== status.NOT_FOUND)
          throw warehouseException(error);
      }
    }
    return result;
  }

  async reserve(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    if (items.length === 0 || items.length > 100) {
      throw new BadRequestException(
        'Warehouse reservations require between 1 and 100 distinct products.',
      );
    }
    const context = this.context(transaction);
    const request: ReserveStockRequest = {
      orderId: orderId.toString(),
      idempotencyKey: `ecommerce:order:${orderId}:reserve`,
      items,
      // Match ORM reservations, which remain active until cancellation/delivery.
      expiresInSeconds: 0,
    };
    let reservation: WarehouseReservation | undefined;
    let mayHaveReserved = true;

    // Register before the call: a deadline can hide a successful remote commit.
    context.onRollback(async () => {
      if (!mayHaveReserved) return;
      try {
        reservation ??= await this.client.call('reserveStock', request);
        if (!reservation.id || reservation.orderId !== request.orderId) {
          throw new ConflictException(
            'Warehouse returned a reservation for a different order.',
          );
        }
        await this.client.call('releaseReservation', {
          reservationId: reservation.id,
          reason: `Checkout rolled back for order #${orderId}`,
        });
      } catch (error) {
        this.logger.error(
          `Unable to release warehouse reservation for order ${orderId}; key=${request.idempotencyKey}; reservation=${reservation?.id ?? 'unknown'}`,
        );
        throw error;
      }
    });

    try {
      reservation = await this.client.call('reserveStock', request);
    } catch (error) {
      mayHaveReserved = isUncertainGrpcFailure(error);
      throw warehouseException(error);
    }
    if (
      !reservation.id ||
      reservation.orderId !== request.orderId ||
      reservation.status !== 'active'
    ) {
      // Never release a pre-existing terminal reservation recovered by idempotency.
      mayHaveReserved =
        reservation.status === 'active' &&
        reservation.orderId === request.orderId;
      throw new ConflictException(
        'Warehouse reservation is not active for this order.',
      );
    }
    const repository = context.manager.getRepository(
      OrderInventoryReservationOrmEntity,
    );
    await repository.save(
      repository.create({ orderId, reservationId: reservation.id }),
    );
  }

  async releaseReservation(
    transaction: OrderTransactionContext,
    _items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    const reservationId = await this.reservationId(transaction, orderId);
    try {
      await this.client.call('releaseReservation', {
        reservationId,
        reason: `Order #${orderId} cancelled`,
      });
    } catch (error) {
      throw warehouseException(error);
    }
  }

  async fulfillReservation(
    transaction: OrderTransactionContext,
    _items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    const reservationId = await this.reservationId(transaction, orderId);
    try {
      await this.client.call('confirmReservation', { reservationId });
    } catch (error) {
      throw warehouseException(error);
    }
  }

  private context(
    transaction: OrderTransactionContext,
  ): TypeOrmOrderTransactionContext {
    if (!(transaction instanceof TypeOrmOrderTransactionContext))
      throw new Error('Invalid order transaction context.');
    return transaction;
  }

  private async reservationId(
    transaction: OrderTransactionContext,
    orderId: number,
  ): Promise<string> {
    const record = await this.context(transaction)
      .manager.getRepository(OrderInventoryReservationOrmEntity)
      .findOneBy({ orderId });
    if (!record)
      throw new ConflictException(
        `Order #${orderId} has no warehouse reservation. Check the inventory backend used when it was created.`,
      );
    return record.reservationId;
  }
}
