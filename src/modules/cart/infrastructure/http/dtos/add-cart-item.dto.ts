import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'ID of the product to add to the cart.',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({
    description: 'Number of units to add. Defaults to 1.',
    example: 2,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;
}