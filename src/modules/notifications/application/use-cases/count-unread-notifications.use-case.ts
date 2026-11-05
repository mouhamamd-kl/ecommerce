import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationRecipientType } from '../../domain/enums/notification-recipient-type.enum.js';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
  ) {}

  async execute(customerId: number): Promise<number> {
    const scope: NotificationRecipientScope = {
      recipientType: NotificationRecipientType.customer,
      recipientId: customerId,
      includeBroadcasts: false,
    };

    return this.repository.countUnread(scope);
  }
}
