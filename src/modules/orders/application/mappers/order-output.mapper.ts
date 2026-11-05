import { Order } from '../../domain/entities/order.entity.js';
import { OrderOutput } from '../contracts/outputs/order-output.js';
import { OrderItemOutput } from '../contracts/outputs/order-item-output.js';

export class OrderOutputMapper {
  static toItemOutput(item: Order['items'][number]): OrderItemOutput {
    if (item.id === null) {
      throw new Error(
        'Cannot create an output for an order item that has not been persisted.',
      );
    }

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    };
  }

  static toOutput(order: Order): OrderOutput {
    if (order.id === null) {
      throw new Error(
        'Cannot create an output for an order that has not been persisted.',
      );
    }

    return {
      id: order.id,
      userId: order.userId,
      items: order.items.map((item) => this.toItemOutput(item)),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      shippingAddress: order.shippingAddress,
      adminNote: order.adminNote,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  static toOutputs(orders: Order[]): OrderOutput[] {
    return orders.map((order) => this.toOutput(order));
  }
}