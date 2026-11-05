import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'New product name.',
    example: 'Wireless Headphones (2nd gen)',
    minLength: 2,
    maxLength: 150,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'New product price. Must be positive with at most 2 decimal places.',
    example: 49.99,
    minimum: 0.01,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;

  @ApiPropertyOptional({
    description: 'Set to false to soft-disable the product.',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Replace the product’s category links with this set of IDs.',
    example: [1],
    type: [Number],
    uniqueItems: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Replace the product’s photos with this set.',
    type: () => [ProductPhotoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPhotoDto)
  photos?: ProductPhotoDto[];
}