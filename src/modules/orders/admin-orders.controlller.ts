import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { OrdersService } from './orders.service.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { AdminJwtGuard } from '../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin / Orders')
@ApiBearerAuth('access-token')
@Controller('admin/orders')
@UseGuards(AdminJwtGuard)
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * GET /admin/orders
   * List all orders.
   */
  @Get()
  async findAll(@Res() response: Response) {
    const orders = await this.ordersService.findAll();

    return ApiResponse.sendResponseSuccess(
      response,
      orders,
      'Orders retrieved successfully',
      200,
    );
  }

  /**
   * GET /admin/orders/:id
   * Retrieve any order by ID.
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const order = await this.ordersService.findById(id);

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order retrieved successfully',
      200,
    );
  }

  /**
   * PATCH /admin/orders/:id/status
   * Change the order status.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Res() response: Response,
  ) {
    const order = await this.ordersService.updateStatus(id, dto);

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order status updated successfully',
      200,
    );
  }
}