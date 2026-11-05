import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationNotFoundError } from '../errors/notification-not-found.error.js';
import { NotificationOutput } from '../contracts/outputs/notification.output.js';
import { NotificationOutputMapper } from '../mappers/notification-output.mapper.js';

@Injectable()
export class GetNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
    private readonly outputMapper: NotificationOutputMapper,
  ) {}

  async execute(id: number): Promise<NotificationOutput> {
    const notification = await this.repository.findById(id);

    if (!notification) {
      throw new NotificationNotFoundError(id);
    }

    return this.outputMapper.toOutput(notification);
  }
}
