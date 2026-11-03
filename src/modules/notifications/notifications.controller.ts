import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  HttpException,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { NotificationsService } from './notifications.service.js';
import { ListNotificationsDto } from './dto/list-notifications.dto.js';
import { CustomerJwtGuard } from '../../core/auth/customer/customer-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { NotificationRecipientType } from './entities/enums/notification.enum.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(CustomerJwtGuard)
export class NotificationsController {
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
    @Req() request: AuthenticatedRequest,
    @Query() query: ListNotificationsDto,
    @Res() response: Response,
  ) {
    try {
      const result =
        await this.notificationsService.findForCustomer(
          request.user.id,
          query,
        );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'Notifications retrieved successfully',
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
      const count = await this.notificationsService.countUnread(
        NotificationRecipientType.customer,
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        { unreadCount: count },
        'Unread notification count retrieved successfully',
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
      const result = await this.notificationsService.markAllAsRead(
        NotificationRecipientType.customer,
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'All notifications marked as read',
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
      const notification = await this.notificationsService.markAsRead(
        id,
        NotificationRecipientType.customer,
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        notification,
        'Notification marked as read',
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
      const result = await this.notificationsService.deleteForRecipient(
        id,
        NotificationRecipientType.customer,
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        result,
        'Notification deleted successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }
}