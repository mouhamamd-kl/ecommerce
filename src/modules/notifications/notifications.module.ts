import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// HTTP controllers
import { NotificationsController } from './infrastructure/http/controllers/notifications.controller.js';
import { AdminNotificationsController } from './infrastructure/http/controllers/admin-notifications.controller.js';

// ORM entity
import { NotificationOrmEntity } from './infrastructure/persistence/entities/notification.orm-entity.js';

// Repository implementation
import { NotificationTypeOrmRepository } from './infrastructure/persistence/repositories/notification.typeorm-repository.js';

// Repository port
import {
  NOTIFICATION_REPOSITORY,
} from './application/ports/repositories/notification-repository.port.js';

// Output mapper
import { NotificationOutputMapper } from './application/mappers/notification-output.mapper.js';

// Use cases
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case.js';
import { GetCustomerNotificationsUseCase } from './application/use-cases/get-customer-notifications.use-case.js';
import { GetAllNotificationsUseCase } from './application/use-cases/get-all-notifications.use-case.js';
import { GetNotificationUseCase } from './application/use-cases/get-notification.use-case.js';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case.js';
import { MarkNotificationAsReadUseCase } from './application/use-cases/mark-notification-as-read.use-case.js';
import { MarkAllNotificationsAsReadUseCase } from './application/use-cases/mark-all-notifications-as-read.use-case.js';
import { DeleteRecipientNotificationUseCase } from './application/use-cases/delete-recipient-notification.use-case.js';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationOrmEntity])],

  controllers: [
    NotificationsController,
    AdminNotificationsController,
  ],

  providers: [
    // Repository implementation
    NotificationTypeOrmRepository,

    // Repository port binding
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: NotificationTypeOrmRepository,
    },

    // Output mapper
    NotificationOutputMapper,

    // Use cases
    CreateNotificationUseCase,
    GetCustomerNotificationsUseCase,
    GetAllNotificationsUseCase,
    GetNotificationUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationAsReadUseCase,
    MarkAllNotificationsAsReadUseCase,
    DeleteRecipientNotificationUseCase,
    DeleteNotificationUseCase,
  ],

  exports: [
    NOTIFICATION_REPOSITORY,
    CreateNotificationUseCase,
  ],
})
export class NotificationsModule { }
