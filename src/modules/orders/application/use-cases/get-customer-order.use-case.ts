import { Inject, Injectable } from '@nestjs/common';

import {
    ORDER_REPOSITORY,
    type OrderRepositoryPort,
} from '../ports/repositories/order-repository.port.js';

import { OrderOutput } from '../contracts/outputs/order-output.js';
import { OrderOutputMapper } from '../mappers/order-output.mapper.js';

import { OrderNotFoundError } from '../errors/order-not-found.error.js';

@Injectable()
export class GetCustomerOrderUseCase {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepositoryPort,
    ) { }

    async execute(
        customerId: number,
        orderId: number,
    ): Promise<OrderOutput> {
        const order = await this.orderRepository.findByIdForCustomer(
            customerId,
            orderId,
        );

        if (!order) {
            throw new OrderNotFoundError(orderId);
        }

        return OrderOutputMapper.toOutput(order);
    }
}