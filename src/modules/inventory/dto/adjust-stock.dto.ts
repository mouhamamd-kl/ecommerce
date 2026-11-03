import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({
    description:
      'Whether to add stock to the product or remove it from the available quantity.',
    enum: ['add', 'remove'],
    example: 'add',
  })
  @IsIn(['add', 'remove'])
  operation: 'add' | 'remove';

  @ApiProperty({
    description: 'Number of units to add or remove. Must be at least 1.',
    example: 10,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Human-readable reason for the stock adjustment.',
    example: 'Restock from supplier shipment #1042',
    minLength: 3,
    maxLength: 500,
    type: String,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}