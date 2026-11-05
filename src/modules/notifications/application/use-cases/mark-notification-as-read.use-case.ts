import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationNotFoundError } from '../errors/notification-not-found.error.js';
import { NotificationOutput } from '../contracts/outputs/notification.output.js';
import { NotificationOutputMapper } from '../mappers/notification-output.mapper.js';

import { NotificationRecipientType } from '../../domain/enums/notification-recipient-type.enum.js';

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
    private readonly outputMapper: NotificationOutputMapper,
  ) {}

  async execute(
    id: number,
    customerId: number,
  ): Promise<NotificationOutput> {
    const scope: NotificationRecipientScope = {
      recipientType: NotificationRecipientType.customer,
      recipientId: customerId,
      includeBroadcasts: false,
    };

    const notification = await this.repository.findByIdForRecipient(
      id,
      scope,
    );

    if (!notification) {
      throw new NotificationNotFoundError(id);
    }

    const readNotification = notification.isRead
      ? notification
      : await this.repository.save(notification.markAsRead());

    return this.outputMapper.toOutput(readNotification);
  }
}
