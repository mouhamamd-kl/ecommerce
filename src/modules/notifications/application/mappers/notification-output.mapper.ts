import { Injectable } from '@nestjs/common';

import { Notification } from '../../domain/entities/notification.js';

import { NotificationOutput } from '../contracts/outputs/notification.output.js';
import { PaginatedNotificationsOutput } from '../contracts/outputs/paginated-notifications.output.js';

import type {
  NotificationPagination,
} from '../ports/repositories/notification-repository.port.js';

@Injectable()
export class NotificationOutputMapper {
  toOutput(notification: Notification): NotificationOutput {
    if (notification.id === null) {
      throw new Error('Cannot map an unsaved notification');
    }

    return {
      id: notification.id,
      recipientType: notification.recipientType,
      recipientId: notification.recipientId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedOrderId: notification.relatedOrderId,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  toOutputs(notifications: Notification[]): NotificationOutput[] {
    return notifications.map((notification) => this.toOutput(notification));
  }

  toPaginatedOutput(
    notifications: Notification[],
    total: number,
    pagination: NotificationPagination,
    unreadCount?: number,
  ): PaginatedNotificationsOutput {
    return {
      items: this.toOutputs(notifications),
      pagination: {
        total,
        count: notifications.length,
        per_page: pagination.limit,
        current_page: pagination.page,
        total_pages: Math.ceil(total / pagination.limit),
      },
      ...(unreadCount !== undefined ? { unreadCount } : {}),
    };
  }
}
