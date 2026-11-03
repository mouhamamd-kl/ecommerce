import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PaymentMethod } from '../order-status.js';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Shipping address for the order.',
    example: '123 Sample Street, Sample City',
    minLength: 5,
    maxLength: 2000,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  shippingAddress: string;

  @ApiProperty({
    description: 'Payment method used for this order.',
    enum: Object.values(PaymentMethod),
    example: PaymentMethod.cashOnDelivery,
  })
  @IsIn(Object.values(PaymentMethod))
  paymentMethod: (typeof PaymentMethod)[keyof typeof PaymentMethod];
}