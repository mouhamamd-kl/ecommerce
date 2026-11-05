import { Inject, Injectable } from '@nestjs/common';

import { OrderStatus } from '../../domain/enums/order-status.js';

import { CancelOrderInput } from '../contracts/inputs/cancel-order.input.js';
import { OrderOutput } from '../contracts/outputs/order-output.js';

import { OrderOutputMapper } from '../mappers/order-output.mapper.js';

import {
    ORDER_REPOSITORY,
    type OrderRepositoryPort,
} from '../ports/repositories/order-repository.port.js';

import {
    INVENTORY,
    type InventoryPort,
} from '../ports/services/inventory.port.js';

import {
    ORDER_UNIT_OF_WORK,
    type OrderUnitOfWorkPort,
} from '../ports/services/order-unit-of-work.port.js';

import {
    ORDER_NOTIFICATION,
    type NotificationPort,
} from '../ports/services/notification.port.js';

import { OrderNotFoundError } from '../errors/order-not-found.error.js';

import { OrderCancellationNotAllowedError } from '../errors/order-cancellation-not-allowed.error.js';

@Injectable()
export class CancelCustomerOrderUseCase {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepositoryPort,

        @Inject(INVENTORY)
        private readonly inventory: InventoryPort,

        @Inject(ORDER_UNIT_OF_WORK)
        private readonly unitOfWork: OrderUnitOfWorkPort,

        @Inject(ORDER_NOTIFICATION)
        private readonly notification: NotificationPort,
    ) {}

    async execute(input: CancelOrderInput): Promise<OrderOutput> {
        const order = await this.unitOfWork.execute(async (transaction) => {
            const currentOrder =
                await this.orderRepository.findByIdForCustomerUpdate(
                    transaction,
                    input.customerId,
                    input.orderId,
                );

            if (!currentOrder) {
                // Do not reveal whether an order belonging to another customer exists.
                throw new OrderNotFoundError(input.orderId);
            }

            if (
                currentOrder.status !== OrderStatus.pending &&
                currentOrder.status !== OrderStatus.confirmed
            ) {
                throw new OrderCancellationNotAllowedError(
                    input.orderId,
                    currentOrder.status,
                );
            }

            const quantitiesByProductId = new Map<number, number>();

            for (const item of currentOrder.items) {
                if (item.productId === null) {
                    continue;
                }

                const currentQuantity =
                    quantitiesByProductId.get(item.productId) ?? 0;

                quantitiesByProductId.set(
                    item.productId,
                    currentQuantity + item.quantity,
                );
            }

            const productIds = [...quantitiesByProductId.keys()];

            if (productIds.length > 0) {
                await this.inventory.findByProductIdsForUpdate(
                    transaction,
                    productIds,
                );
            }

            currentOrder.changeStatus(OrderStatus.cancelled);

            await this.inventory.releaseReservation(
                transaction,
                [...quantitiesByProductId].map(([productId, quantity]) => ({
                    productId,
                    quantity,
                })),
                input.orderId,
            );

            return this.orderRepository.save(transaction, currentOrder);
        });

        const output = OrderOutputMapper.toOutput(order);

        await this.notification.notifyOrderStatusChanged(output);

        return output;
    }
}
