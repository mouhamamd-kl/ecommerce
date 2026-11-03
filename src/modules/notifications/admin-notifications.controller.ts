import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
  HttpException,
} from '@nestjs/common';

import type { Response } from 'express';

import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { ListNotificationsDto } from './dto/list-notifications.dto.js';
import { AdminJwtGuard } from '../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin / Notifications')
@ApiBearerAuth('access-token')
@Controller('admin/notifications')
@UseGuards(AdminJwtGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  private handleError(response: Response, error: unknown) {
    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const errorResponse = error.getResponse();

      const message =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'message' in errorResponse
          ? (errorResponse as { message: string | string[] }).message
          : error.message;

      return ApiResponse.sendResponseError(
        response,
        message,
        statusCode,
      );
    }

    return ApiResponse.sendResponseError(
      response,
      'An unexpected error occurred',
      500,
    );
  }

  @Get()
  async findAll(
    @Query() query: ListNotificationsDto,
    @Res() response: Response,
  ) {
    try {
      const result = await this.notificationsService.findAll(query);

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'Notifications retrieved successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      const notification =
        await this.notificationsService.findById(id);

      return ApiResponse.sendResponseSuccess(
        response,
        notification,
        'Notification retrieved successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }


}