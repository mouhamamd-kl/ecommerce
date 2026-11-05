import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'ID of the product this inventory record belongs to.',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiPropertyOptional({
    description: 'Initial quantity on hand. Defaults to 0.',
    example: 30,
    minimum: 0,
    default: 0,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityOnHand?: number = 0;

  @ApiPropertyOptional({
    description:
      'Threshold at or below which the product is considered low on stock. Defaults to 5.',
    example: 5,
    minimum: 0,
    default: 5,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number = 5;
}
