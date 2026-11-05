import { Inject, Injectable } from '@nestjs/common';

import { Notification } from '../../domain/entities/notification.js';

import { CreateNotificationInput } from '../contracts/inputs/create-notification.input.js';
import { NotificationOutput } from '../contracts/outputs/notification.output.js';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../ports/repositories/notification-repository.port.js';

import { NotificationOutputMapper } from '../mappers/notification-output.mapper.js';

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepositoryPort,
    private readonly outputMapper: NotificationOutputMapper,
  ) {}

  async execute(
    input: CreateNotificationInput,
  ): Promise<NotificationOutput> {
    const notification = new Notification({
      id: null,
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedOrderId: input.relatedOrderId ?? null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.repository.save(notification);

    return this.outputMapper.toOutput(saved);
  }
}
