import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  NotificationType,
  NotificationRecipientType,
} from '../entities/enums/notification.enum.js';

export class CreateNotificationDto {
  @ApiProperty({
    description:
      'Who the notification is for. Use "admin" with no recipientId for an admin-wide notification, or "customer" with a recipientId for a specific customer.',
    enum: NotificationRecipientType,
    example: NotificationRecipientType.customer,
  })
  @IsEnum(NotificationRecipientType)
  recipientType: (typeof NotificationRecipientType)[keyof typeof NotificationRecipientType];

  /**
   * Required for an individual recipient.
   * Omit for an admin-wide notification.
   */
  @ApiPropertyOptional({
    description:
      'Recipient user ID. Required when recipientType is "customer". Omit for admin-wide notifications.',
    example: 2,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recipientId?: number;

  @ApiProperty({
    description: 'Category of the notification. Affects how it is rendered and filtered.',
    enum: NotificationType,
    example: NotificationType.orderCreated,
  })
  @IsEnum(NotificationType)
  type: (typeof NotificationType)[keyof typeof NotificationType];

  @ApiProperty({
    description: 'Short notification title.',
    example: 'Sample order created',
    minLength: 1,
    maxLength: 150,
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Full notification body.',
    example: 'Your sample order #42 has been created.',
    minLength: 1,
    maxLength: 5000,
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description:
      'Optional order ID to associate this notification with. Useful for "order created" / "payment received" style notifications.',
    example: 42,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  relatedOrderId?: number;
}