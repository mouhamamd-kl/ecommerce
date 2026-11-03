import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../modules/users/users.service.js';
import { CustomerRegisterDto } from './dto/customer-register.dto.js';
import { CustomerLoginDto } from './dto/customer-login.dto.js';
import { User } from '../../../modules/users/entities/user.entity.js';
import { Role } from '../../../modules/users/roles.js';


@Injectable()
export class CustomerAuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: CustomerRegisterDto) {
        // 1. Force the 'customer' role
        const existingUser = await this.userService.findOneByEmail(dto.email,);
        if (existingUser) {
            throw new ConflictException('A customer with this email already exists.');
        }

        const user = await this.userService.create({
            email: dto.email,
            password: dto.password,
            role: Role.customer,
        });

        return this.issueToken(user);
    }

    async login(dto: CustomerLoginDto) {
        const user = await this.userService.findOneByEmail(
            dto.email,
        );

        if (
            !user ||
            !(await bcrypt.compare(dto.password, user.password))
        ) {
            throw new UnauthorizedException('Invalid email or password');
        }

        return this.issueToken(user);
    }

    private async issueToken(user: User) {
        return {
            access_token: await this.jwtService.signAsync({
                sub: user.id,
            }),
            token_type: 'Bearer',
        };
    }
}