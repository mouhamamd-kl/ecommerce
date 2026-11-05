import type { Notification } from '../../../domain/entities/notification.js';
import type {
  NotificationRecipientTypeValue,
} from '../../../domain/enums/notification-recipient-type.enum.js';
import type {
  NotificationTypeValue,
} from '../../../domain/enums/notification-type.enum.js';

export interface NotificationRecipientScope {
  recipientType: NotificationRecipientTypeValue;
  recipientId: number;
  includeBroadcasts: boolean;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationTypeValue;
}

export interface NotificationPagination {
  page: number;
  limit: number;
}

export interface NotificationPageResult {
  items: Notification[];
  total: number;
}

export interface NotificationRepositoryPort {
  save(notification: Notification): Promise<Notification>;

  findById(id: number): Promise<Notification | null>;

  findByIdForRecipient(
    id: number,
    scope: NotificationRecipientScope,
  ): Promise<Notification | null>;

  findForRecipient(
    scope: NotificationRecipientScope,
    filters: NotificationFilters,
    pagination: NotificationPagination,
  ): Promise<NotificationPageResult>;

  findAll(
    filters: NotificationFilters,
    pagination: NotificationPagination,
  ): Promise<NotificationPageResult>;

  countUnread(scope: NotificationRecipientScope): Promise<number>;

  markAllAsRead(scope: NotificationRecipientScope): Promise<void>;

  deleteById(id: number): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
