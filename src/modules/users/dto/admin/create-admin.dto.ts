import { IsEmail, IsIn, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Role } from '../../roles.js';
export class CreateAdminDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;

    role: string = Role.admin; // 👈 Assigns the fallback default value
}