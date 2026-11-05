import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import type {
  NotificationRecipientTypeValue,
} from '../../../domain/enums/notification-recipient-type.enum.js';
import type {
  NotificationTypeValue,
} from '../../../domain/enums/notification-type.enum.js';

@Entity('notifications')
@Index('IDX_notifications_recipient_read_created', [
  'recipientType',
  'recipientId',
  'isRead',
  'createdAt',
])
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'recipient_type',
    type: 'varchar',
    length: 20,
  })
  recipientType: NotificationRecipientTypeValue;

  /**
   * Customer or admin database ID.
   * Null means a notification intended for all admins.
   */
  @Column({
    name: 'recipient_id',
    type: 'int',
    nullable: true,
  })
  recipientId: number | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: NotificationTypeValue;

  @Column({
    type: 'varchar',
    length: 150,
  })
  title: string;

  @Column({
    type: 'text',
  })
  message: string;

  @Column({
    name: 'related_order_id',
    type: 'int',
    nullable: true,
  })
  relatedOrderId: number | null;

  @Column({
    name: 'is_read',
    type: 'boolean',
    default: false,
  })
  isRead: boolean;

  @Column({
    name: 'read_at',
    type: 'timestamp',
    nullable: true,
  })
  readAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
