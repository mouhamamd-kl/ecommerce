import { Inject, Injectable } from '@nestjs/common';

import {
    ORDER_REPOSITORY,
    type OrderRepositoryPort,
} from '../ports/repositories/order-repository.port.js';

import { OrderOutput } from '../contracts/outputs/order-output.js';
import { OrderOutputMapper } from '../mappers/order-output.mapper.js';

import { OrderNotFoundError } from '../errors/order-not-found.error.js';

@Injectable()
export class GetOrderUseCase {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepositoryPort,
    ) { }

    async execute(orderId: number): Promise<OrderOutput> {
        const order = await this.orderRepository.findById(orderId);

        if (!order) {
            throw new OrderNotFoundError(orderId);
        }

        return OrderOutputMapper.toOutput(order);
    }
}