import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../roles.js';

export class CreateUserDto {
  @ApiProperty({
    description: 'Customer email address.',
    example: 'alice@example.com',
    format: 'email',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Account password. Minimum 6 characters.',
    example: 'ChangeMe123!',
    minLength: 6,
    format: 'password',
    type: String,
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Account role. Defaults to "customer".',
    enum: [Role.customer, Role.admin],
    default: Role.customer,
    example: Role.customer,
  })
  @IsOptional()
  @IsIn([Role.customer, Role.admin])
  role: string = Role.customer;
}