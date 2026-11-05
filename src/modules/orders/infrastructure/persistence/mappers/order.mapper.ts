import { Order } from '../../../domain/entities/order.entity.js';
import { OrderItem } from '../../../domain/entities/order-item.entity.js';

import { OrderOrmEntity } from '../entities/order.orm-entity.js';
import { OrderItemOrmEntity } from '../entities/order-item.orm-entity.js';

export class OrderMapper {
  static toDomainItem(item: OrderItemOrmEntity): OrderItem {
    return new OrderItem({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
    });
  }

  static toDomain(entity: OrderOrmEntity): Order {
    return new Order({
      id: entity.id,
      userId: entity.userId,

      items: (entity.items ?? []).map((item) =>
        this.toDomainItem(item),
      ),

      status: entity.status,
      paymentStatus: entity.paymentStatus,
      paymentMethod: entity.paymentMethod,

      total: Number(entity.total),

      shippingAddress: entity.shippingAddress,
      adminNote: entity.adminNote,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toOrmItem(item: OrderItem): OrderItemOrmEntity {
    const entity = new OrderItemOrmEntity();

    if (item.id !== null) {
      entity.id = item.id;
    }

    entity.productId = item.productId;
    entity.productName = item.productName;
    entity.unitPrice = item.unitPrice;
    entity.quantity = item.quantity;
    entity.subtotal = item.subtotal;

    return entity;
  }

  static toOrm(order: Order): OrderOrmEntity {
    const entity = new OrderOrmEntity();

    if (order.id !== null) {
      entity.id = order.id;
    }

    entity.userId = order.userId;
    entity.items = order.items.map((item) => this.toOrmItem(item));

    entity.status = order.status;
    entity.paymentStatus = order.paymentStatus;
    entity.paymentMethod = order.paymentMethod;

    entity.total = order.total;

    entity.shippingAddress = order.shippingAddress;
    entity.adminNote = order.adminNote;

    entity.createdAt = order.createdAt;
    entity.updatedAt = order.updatedAt;

    return entity;
  }
}