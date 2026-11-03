import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'New admin password. Minimum 6 characters.',
    example: 'NewChangeMe456!',
    minLength: 6,
    format: 'password',
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}