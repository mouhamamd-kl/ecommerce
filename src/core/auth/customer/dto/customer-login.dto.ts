import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CustomerLoginDto {
  @ApiProperty({
    description: 'Customer email address.',
    example: 'alice@example.com',
    format: 'email',
    maxLength: 254,
    type: String,
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Customer password.',
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