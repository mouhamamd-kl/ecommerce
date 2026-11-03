import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address.',
    example: 'admin@example.com',
    format: 'email',
    maxLength: 254,
    type: String,
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Admin password.',
    example: 'ChangeMe123!',
    minLength: 1,
    maxLength: 72,
    format: 'password',
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}