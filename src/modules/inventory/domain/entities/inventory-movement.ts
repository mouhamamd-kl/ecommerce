import type { InventoryMovementTypeValue } from '../enums/inventory-movement-type.enum.js';

export interface InventoryMovementProps {
  id: number | null;
  inventoryId: number;
  type: InventoryMovementTypeValue;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceOrderId: number | null;
  referenceId?: string | null;
  createdAt: Date;
}

export class InventoryMovement {
  public readonly id: number | null;
  public readonly inventoryId: number;
  public readonly type: InventoryMovementTypeValue;
  public readonly quantity: number;
  public readonly quantityBefore: number;
  public readonly quantityAfter: number;
  public readonly reason: string;
  public readonly referenceOrderId: number | null;
  public readonly referenceId: string | null;
  public readonly createdAt: Date;

  constructor(props: InventoryMovementProps) {
    if (props.quantity <= 0) {
      throw new Error('Inventory movement quantity must be positive');
    }

    if (!props.reason.trim()) {
      throw new Error('Inventory movement reason cannot be empty');
    }

    this.id = props.id;
    this.inventoryId = props.inventoryId;
    this.type = props.type;
    this.quantity = props.quantity;
    this.quantityBefore = props.quantityBefore;
    this.quantityAfter = props.quantityAfter;
    this.reason = props.reason;
    this.referenceOrderId = props.referenceOrderId;
    this.referenceId =
      props.referenceId ?? props.referenceOrderId?.toString() ?? null;
    this.createdAt = props.createdAt;
  }
}
