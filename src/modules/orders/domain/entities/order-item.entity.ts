import { InvalidOrderDataError } from '../errors/invalid-order-data.error.js';

export interface OrderItemProps {
  id: number | null;
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export class OrderItem {
  public readonly id: number | null;
  public readonly productId: number | null;
  public readonly productName: string;
  public readonly unitPrice: number;
  public readonly quantity: number;
  public readonly subtotal: number;

  constructor(props: OrderItemProps) {
    if (!props.productName.trim()) {
      throw new InvalidOrderDataError(
        'Product name cannot be empty.',
      );
    }

    if (!Number.isFinite(props.unitPrice) || props.unitPrice < 0) {
      throw new InvalidOrderDataError(
        'Unit price must be a non-negative number.',
      );
    }

    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new InvalidOrderDataError(
        'Quantity must be a positive integer.',
      );
    }

    this.id = props.id;
    this.productId = props.productId;
    this.productName = props.productName;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;

    this.subtotal = this.unitPrice * this.quantity;

    Object.freeze(this);
  }
}