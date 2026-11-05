import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiResponse } from '../../../../../common/helpers/api-response.js';
import { CustomerJwtGuard } from '../../../../../core/auth/customer/customer-jwt.guard.js';

import { GetCustomerNotificationsUseCase } from '../../../application/use-cases/get-customer-notifications.use-case.js';
import { CountUnreadNotificationsUseCase } from '../../../application/use-cases/count-unread-notifications.use-case.js';
import { MarkNotificationAsReadUseCase } from '../../../application/use-cases/mark-notification-as-read.use-case.js';
import { MarkAllNotificationsAsReadUseCase } from '../../../application/use-cases/mark-all-notifications-as-read.use-case.js';
import { DeleteRecipientNotificationUseCase } from '../../../application/use-cases/delete-recipient-notification.use-case.js';

import { NotificationNotFoundError } from '../../../application/errors/notification-not-found.error.js';

import { InvalidNotificationRecipientError } from '../../../domain/errors/invalid-notification-recipient.error.js';

import { ListNotificationsDto } from '../dtos/list-notifications.dto.js';
import { NotificationHttpMapper } from '../mappers/notification-http.mapper.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getCustomerNotificationsUseCase: GetCustomerNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
    private readonly markAllNotificationsAsReadUseCase: MarkAllNotificationsAsReadUseCase,
    private readonly deleteRecipientNotificationUseCase: DeleteRecipientNotificationUseCase,
  ) {}

  private handleError(response: Response, error: unknown) {
    if (error instanceof NotificationNotFoundError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof InvalidNotificationRecipientError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.BAD_REQUEST,
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
    @Req() request: AuthenticatedRequest,
    @Query() query: ListNotificationsDto,
    @Res() response: Response,
  ) {
    try {
      const result = await this.getCustomerNotificationsUseCase.execute(
        request.user.id,
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

  @Get('unread-count')
  async unreadCount(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const count = await this.countUnreadNotificationsUseCase.execute(
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        { unreadCount: count },
        'Unread notification count retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Patch('read-all')
  async markAllAsRead(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const result =
        await this.markAllNotificationsAsReadUseCase.execute(
          request.user.id,
        );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'All notifications marked as read',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      const notification =
        await this.markNotificationAsReadUseCase.execute(
          id,
          request.user.id,
        );

      return ApiResponse.sendResponseSuccess(
        response,
        notification,
        'Notification marked as read',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Delete(':id')
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      const result =
        await this.deleteRecipientNotificationUseCase.execute(
          id,
          request.user.id,
        );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'Notification deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }
}
