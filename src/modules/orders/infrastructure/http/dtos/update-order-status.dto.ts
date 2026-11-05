import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  OrderStatus,
  type OrderStatusType,
} from '../../../domain/enums/order-status.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.confirmed,
  })
  @IsEnum(OrderStatus)
  status: OrderStatusType;

  @ApiPropertyOptional({
    example: 'Order confirmed and ready for processing.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}