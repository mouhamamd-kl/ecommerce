import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminsService } from '../../../modules/users/admins.service.js';
import { Role } from '../../../modules/users/roles.js';
import { User } from '../../../modules/users/entities/user.entity.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';


@Injectable()
export class AdminAuthService {
    constructor(
        private readonly userService: AdminsService,
        private readonly jwtService: JwtService,
    ) { }


    async login(dto: AdminLoginDto) {
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
        const payload = {
            sub: user.id,
            email: user.email,
            role: Role.admin,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
            token_type: 'Bearer',
        };
    }
}