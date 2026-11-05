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

import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse as SwaggerApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { type Response } from 'express';

import { AdminJwtGuard } from '../../../../../core/auth/admin/admin-jwt.guard.js';

import { GetAllOrdersUseCase } from '../../../application/use-cases/get-all-orders.use-case.js';

import { GetOrderUseCase } from '../../../application/use-cases/get-order.use-case.js';

import { UpdateOrderStatusUseCase } from '../../../application/use-cases/update-order-status.use-case.js';

import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';

import { OrderHttpMapper } from '../mappers/order-http.mapper.js';

import { ApiResponse } from '../../../../../common/helpers/api-response.js';


@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(AdminJwtGuard)
export class AdminOrdersController {
    constructor(
        private readonly getAllOrdersUseCase: GetAllOrdersUseCase,

        private readonly getOrderUseCase: GetOrderUseCase,

        private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all orders' })
    @SwaggerApiResponse({
        status: 200,
        description: 'Orders retrieved successfully.',
    })
    async findAll(@Res() response: Response) {
        const orders = await this.getAllOrdersUseCase.execute();

        return ApiResponse.sendResponseSuccess(
            response,
            orders,
            'Orders retrieved successfully.',
            200,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an order by ID' })
    async findOne(
        @Param('id', ParseIntPipe) id: number,
        @Res() response: Response,
    ) {
        const order = await this.getOrderUseCase.execute(id);

        return ApiResponse.sendResponseSuccess(
            response,
            order,
            'Order retrieved successfully.',
            200,
        );
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update an order status' })
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
        @Res() response: Response,
    ) {
        const input = OrderHttpMapper.toUpdateOrderStatusInput(id, dto);

        const order = await this.updateOrderStatusUseCase.execute(input);

        return ApiResponse.sendResponseSuccess(
            response,
            order,
            'Order status updated successfully.',
            200,
        );
    }
}