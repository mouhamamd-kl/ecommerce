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

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Request, type Response } from 'express';

import { CustomerJwtGuard } from '../../../../../core/auth/customer/customer-jwt.guard.js';

import { CreateOrderUseCase } from '../../../application/use-cases/create-order.use-case.js';

import { GetCustomerOrdersUseCase } from '../../../application/use-cases/get-customer-orders.use-case.js';

import { GetCustomerOrderUseCase } from '../../../application/use-cases/get-customer-order.use-case.js';

import { CancelCustomerOrderUseCase } from '../../../application/use-cases/cancel-customer-order.use-case.js';

import { CreateOrderDto } from '../dtos/create-order.dto.js';

import { OrderHttpMapper } from '../mappers/order-http.mapper.js';

import { ApiResponse } from '../../../../../common/helpers/api-response.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(CustomerJwtGuard)
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,

    private readonly getCustomerOrdersUseCase: GetCustomerOrdersUseCase,

    private readonly getCustomerOrderUseCase: GetCustomerOrderUseCase,

    private readonly cancelCustomerOrderUseCase: CancelCustomerOrderUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an order from the customer cart' })
  @SwaggerApiResponse({
    status: 201,
    description: 'Order created successfully.',
  })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Res() response: Response,
  ) {
    const input = OrderHttpMapper.toCreateOrderInput(dto);

    const order = await this.createOrderUseCase.execute(
      request.user.id,
      input,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order created successfully.',
      201,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all customer orders' })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const orders = await this.getCustomerOrdersUseCase.execute(
      request.user.id,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      orders,
      'Orders retrieved successfully.',
      200,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer order by ID' })
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const order = await this.getCustomerOrderUseCase.execute(
      request.user.id,
      id,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order retrieved successfully.',
      200,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a customer order' })
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const order = await this.cancelCustomerOrderUseCase.execute({
      orderId: id,
      customerId: request.user.id,
    });

    return ApiResponse.sendResponseSuccess(
      response,
      order,
      'Order cancelled successfully.',
      200,
    );
  }
}