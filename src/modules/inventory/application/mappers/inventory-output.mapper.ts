import { Injectable } from '@nestjs/common';

import type { Inventory } from '../../domain/entities/inventory.js';

import { InventoryOutput } from '../contracts/outputs/inventory.output.js';
import { InventoryMovementOutput } from '../contracts/outputs/inventory-movement.output.js';

import type {
  InventoryReadModel,
  InventoryMovementReadModel,
} from '../ports/repositories/inventory-repository.port.js';

@Injectable()
export class InventoryOutputMapper {
  toOutput(model: InventoryReadModel): InventoryOutput {
    if (model.inventory.id === null) {
      throw new Error('Cannot map an unsaved inventory record');
    }

    return {
      id: model.inventory.id,
      productId: model.inventory.productId,
      quantityOnHand: model.inventory.quantityOnHand,
      quantityReserved: model.inventory.quantityReserved,
      lowStockThreshold: model.inventory.lowStockThreshold,
      availableQuantity: model.inventory.availableQuantity,
      isLowStock: model.inventory.isLowStock(),
      createdAt: model.inventory.createdAt,
      updatedAt: model.inventory.updatedAt,
      product: model.product,
    };
  }

  toOutputs(models: InventoryReadModel[]): InventoryOutput[] {
    return models.map((model) => this.toOutput(model));
  }

  toInventoryOnlyOutput(inventory: Inventory): InventoryOutput {
    return this.toOutput({
      inventory,
      product: null,
    });
  }

  toMovementOutput(model: InventoryMovementReadModel): InventoryMovementOutput {
    if (model.movement.id === null) {
      throw new Error('Cannot map an unsaved inventory movement');
    }

    return {
      id: model.movement.id,
      inventoryId: model.movement.inventoryId,
      type: model.movement.type,
      quantity: model.movement.quantity,
      quantityBefore: model.movement.quantityBefore,
      quantityAfter: model.movement.quantityAfter,
      reason: model.movement.reason,
      referenceOrderId: model.movement.referenceOrderId,
      referenceId: model.movement.referenceId,
      createdAt: model.movement.createdAt,
      inventory: model.inventory
        ? this.toInventoryOnlyOutput(model.inventory)
        : null,
    };
  }

  toMovementOutputs(
    models: InventoryMovementReadModel[],
  ): InventoryMovementOutput[] {
    return models.map((model) => this.toMovementOutput(model));
  }
}
