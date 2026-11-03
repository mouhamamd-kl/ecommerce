import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { OrderStatus } from '../order-status.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New status for the order.',
    enum: Object.values(OrderStatus),
    example: OrderStatus.shipped,
  })
  @IsIn(Object.values(OrderStatus))
  status: (typeof OrderStatus)[keyof typeof OrderStatus];

  @ApiPropertyOptional({
    description: 'Optional admin note attached to the status change (audit trail).',
    example: 'Handed off to courier; tracking number added in the notes.',
    maxLength: 1000,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}