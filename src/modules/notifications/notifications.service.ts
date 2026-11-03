import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  IsNull,
  FindOptionsWhere,
} from 'typeorm';

import { Notification } from './entities/notification.entity.js';

import{
  NotificationRecipientType,
  NotificationType,
} from './entities/enums/notification.enum.js';

import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { ListNotificationsDto } from './dto/list-notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a notification.
   *
   * A null recipientId is permitted only for admin-wide notifications.
   */
  async create(dto: CreateNotificationDto) {
    if (
      dto.recipientId === undefined &&
      dto.recipientType !== NotificationRecipientType.admin
    ) {
      throw new BadRequestException(
        'A recipient ID is required for customer notifications',
      );
    }

    const notification = this.notificationRepository.create({
      recipientType: dto.recipientType,
      recipientId: dto.recipientId ?? null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      relatedOrderId: dto.relatedOrderId ?? null,
      isRead: false,
      readAt: null,
    });

    return this.notificationRepository.save(notification);
  }

  /**
   * List notifications belonging to a customer.
   */
  async findForCustomer(
    customerId: number,
    query: ListNotificationsDto,
  ) {
    return this.findRecipientNotifications(
      NotificationRecipientType.customer,
      customerId,
      query,
      false,
    );
  }

  /**
   * List notifications for an admin.
   *
   * Includes notifications addressed to this admin and notifications
   * broadcast to all admins (recipientId = null).
   */
  async findForAdmin(
    adminId: number,
    query: ListNotificationsDto,
  ) {
    return this.findRecipientNotifications(
      NotificationRecipientType.admin,
      adminId,
      query,
      true,
    );
  }

  private async findRecipientNotifications(
    recipientType: string,
    recipientId: number,
    query: ListNotificationsDto,
    includeBroadcasts: boolean,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseWhere: FindOptionsWhere<Notification> = {
      recipientType: recipientType as Notification['recipientType'],
      ...(query.isRead !== undefined
        ? { isRead: query.isRead }
        : {}),
      ...(query.type !== undefined
        ? { type: query.type }
        : {}),
    };

    const where: FindOptionsWhere<Notification>[] =
      includeBroadcasts
        ? [
            { ...baseWhere, recipientId },
            { ...baseWhere, recipientId: IsNull() },
          ]
        : [
            { ...baseWhere, recipientId },
          ];

    const [items, total] =
      await this.notificationRepository.findAndCount({
        where,
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    const unreadCount = await this.countUnread(
      recipientType as Notification['recipientType'],
      recipientId,
      includeBroadcasts,
    );

    return {
      items,
      pagination: {
        total,
        count: items.length,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Count unread notifications for a recipient.
   */
  async countUnread(
    recipientType: Notification['recipientType'],
    recipientId: number,
    includeBroadcasts = false,
  ): Promise<number> {
    const baseWhere: FindOptionsWhere<Notification> = {
      recipientType,
      isRead: false,
    };

    if (includeBroadcasts) {
      return this.notificationRepository.count({
        where: [
          { ...baseWhere, recipientId },
          { ...baseWhere, recipientId: IsNull() },
        ],
      });
    }

    return this.notificationRepository.count({
      where: {
        ...baseWhere,
        recipientId,
      },
    });
  }

  /**
   * Mark one notification as read.
   * Ownership is checked before updating.
   */
  async markAsRead(
    notificationId: number,
    recipientType: Notification['recipientType'],
    recipientId: number,
    includeBroadcasts = false,
  ) {
    const notification = await this.findOwnedNotification(
      notificationId,
      recipientType,
      recipientId,
      includeBroadcasts,
    );

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();

      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  /**
   * Mark all unread notifications for a recipient as read.
   */
  async markAllAsRead(
    recipientType: Notification['recipientType'],
    recipientId: number,
    includeBroadcasts = false,
  ) {
    const where: FindOptionsWhere<Notification>[] =
      includeBroadcasts
        ? [
            {
              recipientType,
              recipientId,
              isRead: false,
            },
            {
              recipientType,
              recipientId: IsNull(),
              isRead: false,
            },
          ]
        : [
            {
              recipientType,
              recipientId,
              isRead: false,
            },
          ];

    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        readAt: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        where
          .map(
            (_, index) =>
              `(${index === 0
                ? 'recipient_type = :recipientType AND recipient_id = :recipientId'
                : 'recipient_type = :recipientType AND recipient_id IS NULL'
              } AND is_read = false)`,
          )
          .join(' OR '),
        {
          recipientType,
          recipientId,
        },
      )
      .execute();

    return {
      updated: true,
    };
  }

  /**
   * Delete a notification only if it belongs to the recipient
   * or is an admin-wide broadcast visible to that admin.
   */
  async deleteForRecipient(
    notificationId: number,
    recipientType: Notification['recipientType'],
    recipientId: number,
    includeBroadcasts = false,
  ) {
    const notification = await this.findOwnedNotification(
      notificationId,
      recipientType,
      recipientId,
      includeBroadcasts,
    );

    await this.notificationRepository.remove(notification);

    return {
      id: notificationId,
      deleted: true,
    };
  }

  private async findOwnedNotification(
    notificationId: number,
    recipientType: Notification['recipientType'],
    recipientId: number,
    includeBroadcasts: boolean,
  ) {
    const where: FindOptionsWhere<Notification>[] =
      includeBroadcasts
        ? [
            {
              id: notificationId,
              recipientType,
              recipientId,
            },
            {
              id: notificationId,
              recipientType,
              recipientId: IsNull(),
            },
          ]
        : [
            {
              id: notificationId,
              recipientType,
              recipientId,
            },
          ];

    const notification = await this.notificationRepository.findOne({
      where,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Admin-only listing across all notifications, with pagination.
   */
  async findAll(query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: FindOptionsWhere<Notification> = {
      ...(query.isRead !== undefined
        ? { isRead: query.isRead }
        : {}),
      ...(query.type !== undefined
        ? { type: query.type }
        : {}),
    };

    const [items, total] =
      await this.notificationRepository.findAndCount({
        where,
        order: {
          createdAt: 'DESC',
          id: 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items,
      pagination: {
        total,
        count: items.length,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin-only notification lookup.
   */
  async findById(id: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Admin-only deletion.
   */
  async deleteById(id: number) {
    const notification = await this.findById(id);

    await this.notificationRepository.remove(notification);

    return {
      id,
      deleted: true,
    };
  }
}