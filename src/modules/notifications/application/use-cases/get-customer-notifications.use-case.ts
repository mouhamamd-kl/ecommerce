import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRecipientScope,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { ListNotificationsInput } from '../contracts/inputs/list-notifications.input.js';
import { PaginatedNotificationsOutput } from '../contracts/outputs/paginated-notifications.output.js';

import { NotificationRecipientType } from '../../domain/enums/notification-recipient-type.enum.js';

import { NotificationOutputMapper } from '../mappers/notification-output.mapper.js';

@Injectable()
export class GetCustomerNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
    private readonly outputMapper: NotificationOutputMapper,
  ) {}

  async execute(
    customerId: number,
    input: ListNotificationsInput,
  ): Promise<PaginatedNotificationsOutput> {
    const scope: NotificationRecipientScope = {
      recipientType: NotificationRecipientType.customer,
      recipientId: customerId,
      includeBroadcasts: false,
    };

    const { items, total } = await this.repository.findForRecipient(
      scope,
      input,
      { page: input.page, limit: input.limit },
    );

    const unreadCount = await this.repository.countUnread(scope);

    return this.outputMapper.toPaginatedOutput(
      items,
      total,
      { page: input.page, limit: input.limit },
      unreadCount,
    );
  }
}
