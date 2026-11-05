import {
  OrderStatus,
  OrderStatusType,
} from '../enums/order-status.js';

import {
  PaymentStatusType,
} from '../enums/payment-status.js';

import {
  PaymentMethodType,
  PaymentMethod,
} from '../enums/payment-method.js';

import { OrderItem } from './order-item.entity.js';

import { InvalidOrderDataError } from '../errors/invalid-order-data.error.js';

import { InvalidOrderTransitionError } from '../errors/invalid-order-transition.error.js';

export interface OrderProps {
  id: number | null;
  userId: number;
  items: OrderItem[];
  status: OrderStatusType;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  total: number;
  shippingAddress: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  public readonly id: number | null;
  public readonly userId: number;
  public readonly items: ReadonlyArray<OrderItem>;
  public readonly paymentMethod: PaymentMethodType;
  public readonly total: number;
  public readonly shippingAddress: string;
  public readonly createdAt: Date;

  private _status: OrderStatusType;
  private _paymentStatus: PaymentStatusType;
  private _adminNote: string | null;
  private _updatedAt: Date;

  constructor(props: OrderProps) {
    if (!Number.isInteger(props.userId) || props.userId < 1) {
      throw new InvalidOrderDataError('Invalid customer ID.');
    }

    if (props.items.length === 0) {
      throw new InvalidOrderDataError(
        'An order must contain at least one item.',
      );
    }

    if (!Number.isFinite(props.total) || props.total < 0) {
      throw new InvalidOrderDataError(
        'Order total must be a non-negative number.',
      );
    }

    if (!props.shippingAddress.trim()) {
      throw new InvalidOrderDataError(
        'Shipping address cannot be empty.',
      );
    }

    const calculatedTotal = props.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    if (Math.abs(calculatedTotal - props.total) > 0.001) {
      throw new InvalidOrderDataError(
        'Order total does not match the sum of its items.',
      );
    }

    this.id = props.id;
    this.userId = props.userId;
    this.items = Object.freeze([...props.items]);

    this._status = props.status;
    this._paymentStatus = props.paymentStatus;

    this.paymentMethod = props.paymentMethod;
    this.total = props.total;
    this.shippingAddress = props.shippingAddress;

    this._adminNote = props.adminNote;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get status(): OrderStatusType {
    return this._status;
  }

  get paymentStatus(): PaymentStatusType {
    return this._paymentStatus;
  }

  get adminNote(): string | null {
    return this._adminNote;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  changeStatus(newStatus: OrderStatusType): void {
    const allowedTransitions: Record<
      OrderStatusType,
      OrderStatusType[]
    > = {
      [OrderStatus.pending]: [
        OrderStatus.confirmed,
        OrderStatus.cancelled,
      ],

      [OrderStatus.confirmed]: [
        OrderStatus.processing,
        OrderStatus.cancelled,
      ],

      [OrderStatus.processing]: [
        OrderStatus.shipped,
        OrderStatus.cancelled,
      ],

      [OrderStatus.shipped]: [
        OrderStatus.delivered,
      ],

      [OrderStatus.delivered]: [],

      [OrderStatus.cancelled]: [],
    };

    if (!allowedTransitions[this._status].includes(newStatus)) {
      throw new InvalidOrderTransitionError(
        this._status,
        newStatus,
      );
    }

    if (
      newStatus === OrderStatus.delivered &&
      this.paymentMethod === PaymentMethod.online &&
      this._paymentStatus !== 'paid'
    ) {
      throw new InvalidOrderDataError(
        'An online order cannot be delivered before payment.',
      );
    }

    this._status = newStatus;
    this.touch();
  }

  updatePaymentStatus(newStatus: PaymentStatusType): void {
    this._paymentStatus = newStatus;
    this.touch();
  }

  updateAdminNote(note: string | null): void {
    this._adminNote = note;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}