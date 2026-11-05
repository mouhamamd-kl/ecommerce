import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { ListNotificationsInput } from '../contracts/inputs/list-notifications.input.js';
import { PaginatedNotificationsOutput } from '../contracts/outputs/paginated-notifications.output.js';

import { NotificationOutputMapper } from '../mappers/notification-output.mapper.js';

@Injectable()
export class GetAllNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
    private readonly outputMapper: NotificationOutputMapper,
  ) {}

  async execute(
    input: ListNotificationsInput,
  ): Promise<PaginatedNotificationsOutput> {
    const { items, total } = await this.repository.findAll(input, {
      page: input.page,
      limit: input.limit,
    });

    return this.outputMapper.toPaginatedOutput(
      items,
      total,
      { page: input.page, limit: input.limit },
    );
  }
}
