import { InsufficientStockError } from '../errors/insufficient-stock.error.js';

export interface InventoryProps {
  id: number | null;
  productId: number;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Inventory {
  public readonly id: number | null;
  public readonly productId: number;
  public readonly quantityOnHand: number;
  public readonly quantityReserved: number;
  public readonly lowStockThreshold: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: InventoryProps) {
    if (props.quantityOnHand < 0) {
      throw new Error('Inventory quantity on hand cannot be negative');
    }

    if (props.quantityReserved < 0) {
      throw new Error('Inventory quantity reserved cannot be negative');
    }

    if (props.lowStockThreshold < 0) {
      throw new Error('Inventory low stock threshold cannot be negative');
    }

    this.id = props.id;
    this.productId = props.productId;
    this.quantityOnHand = props.quantityOnHand;
    this.quantityReserved = props.quantityReserved;
    this.lowStockThreshold = props.lowStockThreshold;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get availableQuantity(): number {
    return this.quantityOnHand - this.quantityReserved;
  }

  isLowStock(): boolean {
    return this.availableQuantity <= this.lowStockThreshold;
  }

  addStock(quantity: number): Inventory {
    return new Inventory({
      id: this.id,
      productId: this.productId,
      quantityOnHand: this.quantityOnHand + quantity,
      quantityReserved: this.quantityReserved,
      lowStockThreshold: this.lowStockThreshold,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  removeStock(quantity: number): Inventory {
    if (quantity > this.availableQuantity) {
      throw new InsufficientStockError(
        this.productId,
        quantity,
        this.availableQuantity,
      );
    }

    return new Inventory({
      id: this.id,
      productId: this.productId,
      quantityOnHand: this.quantityOnHand - quantity,
      quantityReserved: this.quantityReserved,
      lowStockThreshold: this.lowStockThreshold,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}
