import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ProductPhotoDto } from './product-photo.dto.js';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name.',
    example: 'Wireless Headphones',
    minLength: 2,
    maxLength: 150,
    type: String,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Product price. Must be positive with at most 2 decimal places.',
    example: 59.99,
    minimum: 0.01,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @ApiPropertyOptional({
    description: 'Whether the product is active (visible for purchase). Defaults to true.',
    example: true,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'IDs of the categories this product belongs to. Must be unique.',
    example: [1, 2],
    type: [Number],
    uniqueItems: true,
    minItems: 1,
  })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoryIds: number[];

  @ApiPropertyOptional({
    description: 'Optional product photos to create alongside the product.',
    type: () => [ProductPhotoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPhotoDto)
  photos?: ProductPhotoDto[];
}