import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiResponse } from '../../../../../common/helpers/api-response.js';
import { AdminJwtGuard } from '../../../../../core/auth/admin/admin-jwt.guard.js';

import { GetAllNotificationsUseCase } from '../../../application/use-cases/get-all-notifications.use-case.js';
import { GetNotificationUseCase } from '../../../application/use-cases/get-notification.use-case.js';

import { NotificationNotFoundError } from '../../../application/errors/notification-not-found.error.js';

import { ListNotificationsDto } from '../dtos/list-notifications.dto.js';
import { NotificationHttpMapper } from '../mappers/notification-http.mapper.js';

@ApiTags('Admin / Notifications')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly getAllNotificationsUseCase: GetAllNotificationsUseCase,
    private readonly getNotificationUseCase: GetNotificationUseCase,
  ) {}

  private handleError(response: Response, error: unknown) {
    if (error instanceof NotificationNotFoundError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.NOT_FOUND,
      );
    }

    return ApiResponse.sendResponseError(
      response,
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Get()
  async findAll(
    @Query() query: ListNotificationsDto,
    @Res() response: Response,
  ) {
    try {
      const result = await this.getAllNotificationsUseCase.execute(
        NotificationHttpMapper.toListInput(query),
      );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'Notifications retrieved successfully',
        HttpStatus.OK,
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
      const notification = await this.getNotificationUseCase.execute(id);

      return ApiResponse.sendResponseSuccess(
        response,
        notification,
        'Notification retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }
}
