import { Notification } from '../../../domain/entities/notification.js';

import { NotificationOrmEntity } from '../entities/notification.orm-entity.js';

export class NotificationPersistenceMapper {
  static toDomain(orm: NotificationOrmEntity): Notification {
    return new Notification({
      id: orm.id,
      recipientType: orm.recipientType,
      recipientId: orm.recipientId,
      type: orm.type,
      title: orm.title,
      message: orm.message,
      relatedOrderId: orm.relatedOrderId,
      isRead: orm.isRead,
      readAt: orm.readAt,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(notification: Notification): NotificationOrmEntity {
    const orm = new NotificationOrmEntity();

    if (notification.id !== null) {
      orm.id = notification.id;
    }

    orm.recipientType = notification.recipientType;
    orm.recipientId = notification.recipientId;
    orm.type = notification.type;
    orm.title = notification.title;
    orm.message = notification.message;
    orm.relatedOrderId = notification.relatedOrderId;
    orm.isRead = notification.isRead;
    orm.readAt = notification.readAt;

    return orm;
  }
}
