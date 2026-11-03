import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CustomerJwtGuard } from '../../core/auth/customer/customer-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@UseGuards(CustomerJwtGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * POST /orders
   * Create an order from the authenticated customer's cart.
   */
  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Res() response: Response,
  ) {
    const order = await this.ordersService.create(
      request.user.id,
      dto,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order created successfully',
      201,
    );
  }

  /**
   * GET /orders
   * List the authenticated customer's orders.
   */
  @Get()
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const orders = await this.ordersService.findAllForCustomer(
      request.user.id,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      orders,
      'Orders retrieved successfully',
      200,
    );
  }

  /**
   * GET /orders/:id
   * Retrieve one of the customer's orders.
   */
  @Get(':id')
  async findById(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const order = await this.ordersService.findByIdForCustomer(
      request.user.id,
      id,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order retrieved successfully',
      200,
    );
  }

  /**
   * PATCH /orders/:id/cancel
   * Cancel an eligible customer order.
   */
  @Patch(':id/cancel')
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const order = await this.ordersService.cancelForCustomer(
      request.user.id,
      id,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order cancelled successfully',
      200,
    );
  }
}