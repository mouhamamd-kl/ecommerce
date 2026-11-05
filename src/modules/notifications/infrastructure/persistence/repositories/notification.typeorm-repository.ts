import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  IsNull,
  FindOptionsWhere,
} from 'typeorm';

import { Notification } from '../../../domain/entities/notification.js';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationFilters,
  type NotificationPageResult,
  type NotificationPagination,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../../../application/ports/repositories/notification-repository.port.js';

import { NotificationOrmEntity } from '../entities/notification.orm-entity.js';
import { NotificationPersistenceMapper } from '../mappers/notification.persistence.mapper.js';

@Injectable()
export class NotificationTypeOrmRepository
  implements NotificationRepositoryPort
{
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repository: Repository<NotificationOrmEntity>,
  ) {}

  async save(notification: Notification): Promise<Notification> {
    const orm = NotificationPersistenceMapper.toOrm(notification);
    const saved = await this.repository.save(orm);

    return NotificationPersistenceMapper.toDomain(saved);
  }

  async findById(id: number): Promise<Notification | null> {
    const row = await this.repository.findOne({
      where: { id },
    });

    return row
      ? NotificationPersistenceMapper.toDomain(row)
      : null;
  }

  /**
   * A notification is visible to a recipient when it is addressed to them,
   * or when it is an admin-wide broadcast (recipientId null) and the
   * scope includes broadcasts.
   */
  async findByIdForRecipient(
    id: number,
    scope: NotificationRecipientScope,
  ): Promise<Notification | null> {
    const where: FindOptionsWhere<NotificationOrmEntity>[] =
      scope.includeBroadcasts
        ? [
            {
              id,
              recipientType: scope.recipientType,
              recipientId: scope.recipientId,
            },
            {
              id,
              recipientType: scope.recipientType,
              recipientId: IsNull(),
            },
          ]
        : [
            {
              id,
              recipientType: scope.recipientType,
              recipientId: scope.recipientId,
            },
          ];

    const row = await this.repository.findOne({
      where,
    });

    return row
      ? NotificationPersistenceMapper.toDomain(row)
      : null;
  }

  async findForRecipient(
    scope: NotificationRecipientScope,
    filters: NotificationFilters,
    pagination: NotificationPagination,
  ): Promise<NotificationPageResult> {
    const baseWhere: FindOptionsWhere<NotificationOrmEntity> = {
      recipientType: scope.recipientType,
      ...(filters.isRead !== undefined
        ? { isRead: filters.isRead }
        : {}),
      ...(filters.type !== undefined
        ? { type: filters.type }
        : {}),
    };

    const where: FindOptionsWhere<NotificationOrmEntity>[] =
      scope.includeBroadcasts
        ? [
            { ...baseWhere, recipientId: scope.recipientId },
            { ...baseWhere, recipientId: IsNull() },
          ]
        : [
            { ...baseWhere, recipientId: scope.recipientId },
          ];

    const [rows, total] = await this.repository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return {
      items: rows.map(NotificationPersistenceMapper.toDomain),
      total,
    };
  }

  async findAll(
    filters: NotificationFilters,
    pagination: NotificationPagination,
  ): Promise<NotificationPageResult> {
    const where: FindOptionsWhere<NotificationOrmEntity> = {
      ...(filters.isRead !== undefined
        ? { isRead: filters.isRead }
        : {}),
      ...(filters.type !== undefined
        ? { type: filters.type }
        : {}),
    };

    const [rows, total] = await this.repository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return {
      items: rows.map(NotificationPersistenceMapper.toDomain),
      total,
    };
  }

  async countUnread(
    scope: NotificationRecipientScope,
  ): Promise<number> {
    const baseWhere: FindOptionsWhere<NotificationOrmEntity> = {
      recipientType: scope.recipientType,
      isRead: false,
    };

    const where: FindOptionsWhere<NotificationOrmEntity>[] =
      scope.includeBroadcasts
        ? [
            { ...baseWhere, recipientId: scope.recipientId },
            { ...baseWhere, recipientId: IsNull() },
          ]
        : [
            { ...baseWhere, recipientId: scope.recipientId },
          ];

    return this.repository.count({
      where,
    });
  }

  /**
   * Marks every unread notification in the scope as read in one query.
   */
  async markAllAsRead(
    scope: NotificationRecipientScope,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(NotificationOrmEntity)
      .set({
        isRead: true,
        readAt: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        scope.includeBroadcasts
          ? '(recipient_type = :recipientType AND recipient_id = :recipientId AND is_read = false)' +
            ' OR (recipient_type = :recipientType AND recipient_id IS NULL AND is_read = false)'
          : '(recipient_type = :recipientType AND recipient_id = :recipientId AND is_read = false)',
        {
          recipientType: scope.recipientType,
          recipientId: scope.recipientId,
        },
      )
      .execute();
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
