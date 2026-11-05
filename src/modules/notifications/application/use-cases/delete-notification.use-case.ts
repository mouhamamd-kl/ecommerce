import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationNotFoundError } from '../errors/notification-not-found.error.js';

@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
  ) {}

  async execute(id: number): Promise<void> {
    const notification = await this.repository.findById(id);

    if (!notification) {
      throw new NotificationNotFoundError(id);
    }

    await this.repository.deleteById(id);
  }
}
