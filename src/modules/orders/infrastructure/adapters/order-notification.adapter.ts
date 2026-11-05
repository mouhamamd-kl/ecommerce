import { Injectable } from '@nestjs/common';

import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case.js';

import { NotificationRecipientType } from '../../../notifications/domain/enums/notification-recipient-type.enum.js';
import {
  NotificationType,
  type NotificationTypeValue,
} from '../../../notifications/domain/enums/notification-type.enum.js';

import { NotificationPort } from '../../application/ports/services/notification.port.js';

import { OrderStatusType } from '../../domain/enums/order-status.js';
import type { OrderOutput } from '../../application/contracts/outputs/order-output.js';

interface OrderStatusNotificationSpec {
  type: NotificationTypeValue;
  title: string;
  messageTemplate: (orderId: number) => string;
}

const STATUS_NOTIFICATIONS: Record<
  OrderStatusType,
  OrderStatusNotificationSpec
> = {
  pending: {
    type: NotificationType.orderCreated,
    title: 'Order received',
    messageTemplate: (orderId) => `Your order #${orderId} has been received.`,
  },
  confirmed: {
    type: NotificationType.orderConfirmed,
    title: 'Order confirmed',
    messageTemplate: (orderId) => `Your order #${orderId} has been confirmed.`,
  },
  processing: {
    type: NotificationType.orderProcessing,
    title: 'Order processing',
    messageTemplate: (orderId) =>
      `Your order #${orderId} is being processed.`,
  },
  shipped: {
    type: NotificationType.orderShipped,
    title: 'Order shipped',
    messageTemplate: (orderId) => `Your order #${orderId} has been shipped.`,
  },
  delivered: {
    type: NotificationType.orderDelivered,
    title: 'Order delivered',
    messageTemplate: (orderId) => `Your order #${orderId} has been delivered.`,
  },
  cancelled: {
    type: NotificationType.orderCancelled,
    title: 'Order cancelled',
    messageTemplate: (orderId) => `Your order #${orderId} has been cancelled.`,
  },
};

@Injectable()
export class OrderNotificationAdapter implements NotificationPort {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async notifyOrderCreated(order: OrderOutput): Promise<void> {
    await this.createNotification.execute({
      recipientType: NotificationRecipientType.customer,
      recipientId: order.userId,
      type: NotificationType.orderCreated,
      title: 'Order received',
      message: `Your order #${order.id} has been received.`,
      relatedOrderId: order.id,
    });
  }

  async notifyOrderStatusChanged(order: OrderOutput): Promise<void> {
    const spec = STATUS_NOTIFICATIONS[order.status];

    await this.createNotification.execute({
      recipientType: NotificationRecipientType.customer,
      recipientId: order.userId,
      type: spec.type,
      title: spec.title,
      message: spec.messageTemplate(order.id),
      relatedOrderId: order.id,
    });
  }
}
