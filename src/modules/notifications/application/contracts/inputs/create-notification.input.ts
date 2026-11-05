import type {
  NotificationRecipientTypeValue,
} from '../../../domain/enums/notification-recipient-type.enum.js';
import type {
  NotificationTypeValue,
} from '../../../domain/enums/notification-type.enum.js';

export interface CreateNotificationInput {
  recipientType: NotificationRecipientTypeValue;
  recipientId?: number;
  type: NotificationTypeValue;
  title: string;
  message: string;
  relatedOrderId?: number;
}
