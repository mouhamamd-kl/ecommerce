import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationNotFoundError } from '../errors/notification-not-found.error.js';
import { DeleteNotificationOutput } from '../contracts/outputs/notification-action.output.js';

import { NotificationRecipientType } from '../../domain/enums/notification-recipient-type.enum.js';

@Injectable()
export class DeleteRecipientNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
  ) {}

  async execute(
    id: number,
    customerId: number,
  ): Promise<DeleteNotificationOutput> {
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

    await this.repository.deleteById(id);

    return { id, deleted: true };
  }
}
