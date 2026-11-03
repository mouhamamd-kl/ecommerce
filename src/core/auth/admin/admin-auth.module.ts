import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../../../modules/users/users.module.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtStrategy } from './admin-jwt.strategy.js';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
@Module({
    imports: [
        ConfigModule,
        UsersModule,
        PassportModule.register({ defaultStrategy: 'admin-jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): JwtModuleOptions => ({
                secret: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
                signOptions: {
                    expiresIn: config.get<SignOptions['expiresIn']>(
                        'ADMIN_JWT_EXPIRES_IN',
                    ) ?? '15m',
                },
            }),
            //   useFactory: (config: ConfigService) => ({
            //     secret: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
            //     signOptions: {
            //       expiresIn:
            //         config.get<string>('ADMIN_JWT_EXPIRES_IN') ?? '15m',
            //     },
            //   }),
        }),
    ],
    controllers: [AdminAuthController],
    providers: [AdminAuthService, AdminJwtStrategy],
    exports: [AdminAuthService],
})
export class AdminAuthModule { }