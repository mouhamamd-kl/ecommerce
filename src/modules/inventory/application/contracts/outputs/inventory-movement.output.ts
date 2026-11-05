import type { InventoryMovementTypeValue } from '../../../domain/enums/inventory-movement-type.enum.js';

import type { InventoryOutput } from './inventory.output.js';

export interface InventoryMovementOutput {
  id: number;
  inventoryId: number;
  type: InventoryMovementTypeValue;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceOrderId: number | null;
  referenceId: string | null;
  createdAt: Date;
  inventory: Omit<InventoryOutput, 'product'> | null;
}
