import type {
  NotificationRecipientTypeValue,
} from '../../../domain/enums/notification-recipient-type.enum.js';
import type {
  NotificationTypeValue,
} from '../../../domain/enums/notification-type.enum.js';

export interface NotificationOutput {
  id: number;
  recipientType: NotificationRecipientTypeValue;
  recipientId: number | null;
  type: NotificationTypeValue;
  title: string;
  message: string;
  relatedOrderId: number | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
