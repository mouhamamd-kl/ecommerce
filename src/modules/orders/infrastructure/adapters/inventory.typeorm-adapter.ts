import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';

import { InventoryOrmEntity } from '../../../inventory/infrastructure/persistence/entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from '../../../inventory/infrastructure/persistence/entities/inventory-movement.orm-entity.js';

import { InventoryMovementType } from '../../../inventory/domain/enums/inventory-movement-type.enum.js';

import {
  InventoryPort,
  InventoryStock,
  InventoryReservationItem,
} from '../../application/ports/services/inventory.port.js';

import { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';

import { TypeOrmOrderTransactionContext } from '../persistence/typeorm-order-transaction-context.js';

@Injectable()
export class InventoryTypeOrmAdapter implements InventoryPort {
  private getManager(transaction: OrderTransactionContext): EntityManager {
    if (!(transaction instanceof TypeOrmOrderTransactionContext)) {
      throw new Error('Invalid order transaction context.');
    }

    return transaction.manager;
  }

  async findByProductIdsForUpdate(
    transaction: OrderTransactionContext,
    productIds: number[],
  ): Promise<InventoryStock[]> {
    if (productIds.length === 0) {
      return [];
    }

    const repository =
      this.getManager(transaction).getRepository(InventoryOrmEntity);

    const items = await repository.find({
      where: {
        productId: In(productIds),
      },
      lock: {
        mode: 'pessimistic_write',
      },
      order: { productId: 'ASC' },
    });

    return items.map((item) => ({
      productId: item.productId,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
    }));
  }

  async reserve(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    for (const item of [...items].sort((a, b) => a.productId - b.productId)) {
      await this.reserveItem(
        transaction,
        item.productId,
        item.quantity,
        orderId,
      );
    }
  }

  async releaseReservation(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    for (const item of [...items].sort((a, b) => a.productId - b.productId)) {
      await this.releaseItem(
        transaction,
        item.productId,
        item.quantity,
        orderId,
      );
    }
  }

  async fulfillReservation(
    transaction: OrderTransactionContext,
    items: InventoryReservationItem[],
    orderId: number,
  ): Promise<void> {
    for (const item of [...items].sort((a, b) => a.productId - b.productId)) {
      await this.fulfillItem(
        transaction,
        item.productId,
        item.quantity,
        orderId,
      );
    }
  }

  private async reserveItem(
    transaction: OrderTransactionContext,
    productId: number,
    quantity: number,
    orderId: number,
  ): Promise<void> {
    const manager = this.getManager(transaction);

    const inventoryRepository = manager.getRepository(InventoryOrmEntity);
    const movementRepository = manager.getRepository(
      InventoryMovementOrmEntity,
    );

    const inventory = await inventoryRepository.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new Error(`Inventory for product ${productId} was not found.`);
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      inventory.availableQuantity < quantity
    ) {
      throw new Error(`Insufficient stock for product ${productId}.`);
    }

    const quantityBefore = inventory.quantityReserved;

    inventory.quantityReserved += quantity;

    await inventoryRepository.save(inventory);

    const movement = movementRepository.create({
      inventoryId: inventory.id,
      type: InventoryMovementType.reserved,
      quantity,
      quantityBefore,
      quantityAfter: inventory.quantityReserved,
      reason: `Stock reserved for order #${orderId}`,
      referenceOrderId: orderId,
    });

    await movementRepository.save(movement);
  }

  private async releaseItem(
    transaction: OrderTransactionContext,
    productId: number,
    quantity: number,
    orderId: number,
  ): Promise<void> {
    const manager = this.getManager(transaction);

    const inventoryRepository = manager.getRepository(InventoryOrmEntity);
    const movementRepository = manager.getRepository(
      InventoryMovementOrmEntity,
    );

    const inventory = await inventoryRepository.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new Error(`Inventory for product ${productId} was not found.`);
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      inventory.quantityReserved < quantity
    ) {
      throw new Error(`Invalid reservation release for product ${productId}.`);
    }

    const quantityBefore = inventory.quantityReserved;

    inventory.quantityReserved -= quantity;

    await inventoryRepository.save(inventory);

    const movement = movementRepository.create({
      inventoryId: inventory.id,
      type: InventoryMovementType.released,
      quantity,
      quantityBefore,
      quantityAfter: inventory.quantityReserved,
      reason: `Reservation released for order #${orderId}`,
      referenceOrderId: orderId,
    });

    await movementRepository.save(movement);
  }

  private async fulfillItem(
    transaction: OrderTransactionContext,
    productId: number,
    quantity: number,
    orderId: number,
  ): Promise<void> {
    const manager = this.getManager(transaction);

    const inventoryRepository = manager.getRepository(InventoryOrmEntity);
    const movementRepository = manager.getRepository(
      InventoryMovementOrmEntity,
    );

    const inventory = await inventoryRepository.findOne({
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      throw new Error(`Inventory for product ${productId} was not found.`);
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      inventory.quantityReserved < quantity ||
      inventory.quantityOnHand < quantity
    ) {
      throw new Error(
        `Invalid inventory fulfillment for product ${productId}.`,
      );
    }

    const quantityBefore = inventory.quantityOnHand;

    inventory.quantityReserved -= quantity;
    inventory.quantityOnHand -= quantity;

    await inventoryRepository.save(inventory);

    const movement = movementRepository.create({
      inventoryId: inventory.id,
      type: InventoryMovementType.sold,
      quantity,
      quantityBefore,
      quantityAfter: inventory.quantityOnHand,
      reason: `Stock sold for order #${orderId}`,
      referenceOrderId: orderId,
    });

    await movementRepository.save(movement);
  }
}
