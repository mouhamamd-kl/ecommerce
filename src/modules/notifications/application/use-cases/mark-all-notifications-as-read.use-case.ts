import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { MarkAllNotificationsReadOutput } from '../contracts/outputs/notification-action.output.js';

import { NotificationRecipientType } from '../../domain/enums/notification-recipient-type.enum.js';

@Injectable()
export class MarkAllNotificationsAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
  ) {}

  async execute(
    customerId: number,
  ): Promise<MarkAllNotificationsReadOutput> {
    const scope: NotificationRecipientScope = {
      recipientType: NotificationRecipientType.customer,
      recipientId: customerId,
      includeBroadcasts: false,
    };

    await this.repository.markAllAsRead(scope);

    return { updated: true };
  }
}
