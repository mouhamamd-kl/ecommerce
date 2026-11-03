import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../../../modules/users/users.module.js';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerJwtStrategy } from './customer-jwt.strategy.js';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
@Module({
    imports: [
        ConfigModule,
        UsersModule,
        PassportModule.register({ defaultStrategy: 'customer-jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],


            useFactory: (config: ConfigService): JwtModuleOptions => ({
                secret: config.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
                signOptions: {
                    expiresIn: config.get<SignOptions['expiresIn']>(
                        'CUSTOMER_JWT_EXPIRES_IN',
                    ) ?? '15m',
                },
            }),
        }),
    ],
    controllers: [CustomerAuthController],
    providers: [CustomerAuthService, CustomerJwtStrategy],
    exports: [CustomerAuthService],
})
export class CustomerAuthModule { }