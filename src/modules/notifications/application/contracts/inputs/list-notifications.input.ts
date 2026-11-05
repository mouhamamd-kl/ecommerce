import type {
  NotificationTypeValue,
} from '../../../domain/enums/notification-type.enum.js';

export interface ListNotificationsInput {
  page: number;
  limit: number;
  isRead?: boolean;
  type?: NotificationTypeValue;
}
