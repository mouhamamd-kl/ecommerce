import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CustomerRegisterDto {
  @ApiProperty({
    description: 'Customer email address.',
    example: 'newcustomer@example.com',
    format: 'email',
    maxLength: 254,
    type: String,
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Account password. Minimum 8 characters (bcrypt limit: 72 bytes).',
    example: 'ChangeMe123!',
    minLength: 8,
    maxLength: 72,
    format: 'password',
    type: String,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}