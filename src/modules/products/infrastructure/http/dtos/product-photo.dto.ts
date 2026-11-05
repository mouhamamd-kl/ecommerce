import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProductPhotoDto {
  @ApiProperty({
    description: 'Public URL of the product photo.',
    example: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    minLength: 1,
    maxLength: 2048,
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({
    description:
      'Whether this is the primary photo. If omitted and no other photo is primary, the first photo is treated as primary.',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order used when rendering photos. Lower values appear first.',
    example: 0,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
