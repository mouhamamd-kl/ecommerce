import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AdminsService } from '../../../modules/users/admins.service.js';
import { Role } from '../../../modules/users/roles.js';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(
  Strategy,
  'admin-jwt',
) {
  constructor(
    config: ConfigService,
    private readonly adminsService: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: number }) {
    const user = await this.adminsService.findById(payload.sub);

    if (!user || user.role !== Role.admin) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}