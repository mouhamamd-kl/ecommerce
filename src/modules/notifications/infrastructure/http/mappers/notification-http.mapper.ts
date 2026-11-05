import { CreateNotificationDto } from '../dtos/create-notification.dto.js';
import { ListNotificationsDto } from '../dtos/list-notifications.dto.js';

import { CreateNotificationInput } from '../../../application/contracts/inputs/create-notification.input.js';
import { ListNotificationsInput } from '../../../application/contracts/inputs/list-notifications.input.js';

export class NotificationHttpMapper {
  static toCreateInput(
    dto: CreateNotificationDto,
  ): CreateNotificationInput {
    return {
      recipientType: dto.recipientType,
      ...(dto.recipientId !== undefined
        ? { recipientId: dto.recipientId }
        : {}),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      ...(dto.relatedOrderId !== undefined
        ? { relatedOrderId: dto.relatedOrderId }
        : {}),
    };
  }

  static toListInput(
    query: ListNotificationsDto,
  ): ListNotificationsInput {
    return {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      ...(query.isRead !== undefined
        ? { isRead: query.isRead }
        : {}),
      ...(query.type !== undefined
        ? { type: query.type }
        : {}),
    };
  }
}
