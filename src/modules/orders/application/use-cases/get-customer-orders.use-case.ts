import { Inject, Injectable } from '@nestjs/common';

import {
    ORDER_REPOSITORY,
    type OrderRepositoryPort,
} from '../ports/repositories/order-repository.port.js';

import { OrderOutput } from '../contracts/outputs/order-output.js';
import { OrderOutputMapper } from '../mappers/order-output.mapper.js';

@Injectable()
export class GetCustomerOrdersUseCase {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepositoryPort,
    ) { }

    async execute(customerId: number): Promise<OrderOutput[]> {
        const orders =
            await this.orderRepository.findAllForCustomer(customerId);

        return OrderOutputMapper.toOutputs(orders);
    }
}