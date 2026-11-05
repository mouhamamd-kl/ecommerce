import { BadGatewayException } from '@nestjs/common';
import { Inventory } from '../../domain/entities/inventory.js';
import { InventoryMovement } from '../../domain/entities/inventory-movement.js';
import { InventoryMovementType } from '../../domain/enums/inventory-movement-type.enum.js';
import type {
  WarehouseInventory,
  WarehouseMovement,
} from './warehouse-grpc.contract.js';

function date(value: string): Date {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime()))
    throw new BadGatewayException('Warehouse returned an invalid timestamp.');
  return result;
}

export function inventoryFromGrpc(item: WarehouseInventory): Inventory {
  return new Inventory({
    ...item,
    createdAt: date(item.createdAt),
    updatedAt: date(item.updatedAt),
  });
}

export function movementFromGrpc(item: WarehouseMovement): InventoryMovement {
  const type = Object.values(InventoryMovementType).find(
    (type) => type === item.type,
  );
  if (!type)
    throw new BadGatewayException(
      'Warehouse returned an unknown movement type.',
    );
  // Warehouse references can be opaque reservation IDs, rather than order numbers.
  return new InventoryMovement({
    ...item,
    type,
    referenceId: item.referenceId || null,
    referenceOrderId: null,
    createdAt: date(item.createdAt),
  });
}
