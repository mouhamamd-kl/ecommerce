import { Inventory } from '../../../domain/entities/inventory.js';
import { InventoryMovement } from '../../../domain/entities/inventory-movement.js';

import type {
  InventoryProductSnapshot,
  InventoryReadModel,
  InventoryMovementReadModel,
} from '../../../application/ports/repositories/inventory-repository.port.js';

import { InventoryOrmEntity } from '../entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from '../entities/inventory-movement.orm-entity.js';

export class InventoryMapper {
  static toDomain(orm: InventoryOrmEntity): Inventory {
    return new Inventory({
      id: orm.id,
      productId: orm.productId,
      quantityOnHand: orm.quantityOnHand,
      quantityReserved: orm.quantityReserved,
      lowStockThreshold: orm.lowStockThreshold,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(inventory: Inventory): InventoryOrmEntity {
    const orm = new InventoryOrmEntity();

    if (inventory.id !== null) {
      orm.id = inventory.id;
    }

    orm.productId = inventory.productId;
    orm.quantityOnHand = inventory.quantityOnHand;
    orm.quantityReserved = inventory.quantityReserved;
    orm.lowStockThreshold = inventory.lowStockThreshold;

    // createdAt/updatedAt are managed by @CreateDateColumn/@UpdateDateColumn.
    return orm;
  }

  static toProductSnapshot(
    orm: InventoryOrmEntity,
  ): InventoryProductSnapshot | null {
    if (!orm.product) {
      return null;
    }

    return {
      id: orm.product.id,
      name: orm.product.name,
      price: orm.product.price,
      isActive: orm.product.isActive,
    };
  }

  static toReadModel(orm: InventoryOrmEntity): InventoryReadModel {
    return {
      inventory: this.toDomain(orm),
      product: this.toProductSnapshot(orm),
    };
  }

  static toMovementReadModel(
    orm: InventoryMovementOrmEntity,
  ): InventoryMovementReadModel {
    return {
      movement: new InventoryMovement({
        id: orm.id,
        inventoryId: orm.inventoryId,
        type: orm.type,
        quantity: orm.quantity,
        quantityBefore: orm.quantityBefore,
        quantityAfter: orm.quantityAfter,
        reason: orm.reason,
        referenceOrderId: orm.referenceOrderId,
        createdAt: orm.createdAt,
      }),
      inventory: orm.inventory ? this.toDomain(orm.inventory) : null,
    };
  }

  static toMovementOrm(movement: InventoryMovement): InventoryMovementOrmEntity {
    const orm = new InventoryMovementOrmEntity();

    if (movement.id !== null) {
      orm.id = movement.id;
    }

    orm.inventoryId = movement.inventoryId;
    orm.type = movement.type;
    orm.quantity = movement.quantity;
    orm.quantityBefore = movement.quantityBefore;
    orm.quantityAfter = movement.quantityAfter;
    orm.reason = movement.reason;
    orm.referenceOrderId = movement.referenceOrderId;

    // createdAt is managed by @CreateDateColumn.
    return orm;
  }
}
