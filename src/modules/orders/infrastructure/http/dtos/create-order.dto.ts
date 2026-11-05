import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import {
  PaymentMethod,
  type PaymentMethodType,
} from '../../../domain/enums/payment-method.js';

export class CreateOrderDto {
  @ApiProperty({
    example: '123 Main Street, Toronto, ON',
    description: 'Shipping address for the order.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  shippingAddress: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.cashOnDelivery,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethodType;
}