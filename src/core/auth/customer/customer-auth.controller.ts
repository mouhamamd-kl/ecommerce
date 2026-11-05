
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerJwtGuard } from './customer-jwt.guard.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerLoginDto } from './dto/customer-login.dto.js';
import { CustomerRegisterDto } from './dto/customer-register.dto.js';
import { ApiResponse } from '../../../common/helpers/api-response.js';

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}
@ApiTags('Customer Authentication')
@Controller('auth')
export class CustomerAuthController {
    constructor(
        private readonly authService: CustomerAuthService,
    ) { }

    @Throttle({ default: { limit: 50, ttl: 60_000 } })
    @Post('customer/register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() dto: CustomerRegisterDto,
        @Res() response: Response,
    ) {
        const data = await this.authService.register(dto);

        return ApiResponse.sendResponseSuccess(
            response,
            data,
            'Customer registered successfully',
            HttpStatus.CREATED,
        );
    }

    @Throttle({ default: { limit: 50, ttl: 60_000 } })
    @Post('customer/login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: CustomerLoginDto,
        @Res() response: Response,
    ) {
        const data = await this.authService.login(dto);

        return ApiResponse.sendResponseSuccess(
            response,
            data,
            'Login successful',
            HttpStatus.OK,
        );
    }

    @UseGuards(CustomerJwtGuard)
    @ApiBearerAuth('access-token')
    @Get('customer/me')
    getProfile(
        @Req() req: AuthenticatedRequest,
        @Res() response: Response,
    ) {
        return ApiResponse.sendResponseSuccess(
            response,
            req.user,
            'Profile retrieved successfully',
            HttpStatus.OK,
        );
    }
}
