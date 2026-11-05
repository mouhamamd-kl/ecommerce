import {
  NotificationRecipientType,
  type NotificationRecipientTypeValue,
} from '../enums/notification-recipient-type.enum.js';

import type {
  NotificationTypeValue,
} from '../enums/notification-type.enum.js';

import { InvalidNotificationRecipientError } from '../errors/invalid-notification-recipient.error.js';

export interface NotificationProps {
  id: number | null;
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

export class Notification {
  public readonly id: number | null;
  public readonly recipientType: NotificationRecipientTypeValue;
  public readonly recipientId: number | null;
  public readonly type: NotificationTypeValue;
  public readonly title: string;
  public readonly message: string;
  public readonly relatedOrderId: number | null;
  public readonly isRead: boolean;
  public readonly readAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: NotificationProps) {
    this.id = props.id;
    this.recipientType = props.recipientType;
    this.recipientId = props.recipientId;
    this.type = props.type;
    this.title = props.title;
    this.message = props.message;
    this.relatedOrderId = props.relatedOrderId;
    this.isRead = props.isRead;
    this.readAt = props.readAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    this.validateRecipient(props.recipientType, props.recipientId);
  }

  markAsRead(): Notification {
    if (this.isRead) {
      return this;
    }

    const now = new Date();

    return new Notification({
      ...this,
      isRead: true,
      readAt: now,
      updatedAt: now,
    });
  }

  private validateRecipient(
    recipientType: NotificationRecipientTypeValue,
    recipientId: number | null,
  ): void {
    if (
      recipientId === null &&
      recipientType !== NotificationRecipientType.admin
    ) {
      throw new InvalidNotificationRecipientError();
    }
  }
}
