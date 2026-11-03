import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards, Res,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { ApiResponse } from '../../../common/helpers/api-response.js';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';


interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}
@ApiTags('Admin Authentication')
@Controller('auth')
export class AdminAuthController {
    constructor(private readonly authService: AdminAuthService) { }

    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Post('admin/login')
    async login(@Body() dto: AdminLoginDto, @Res() response: Response) {
        const data = await this.authService.login(dto);

        return ApiResponse.sendResponseSuccess(
            response,
            data,
            'Login successful',
            HttpStatus.OK,
        );
    }

    @UseGuards(AdminJwtGuard)
    @ApiBearerAuth('access-token')
    @Get('admin/me')
    getProfile(@Req() req: AuthenticatedRequest, @Res() response: Response,) {
        return ApiResponse.sendResponseSuccess(
            response,
            req.user,
            'Profile retrieved successfully',
            HttpStatus.OK,
        );

    }
}