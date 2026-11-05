import { Inject, Injectable } from '@nestjs/common';

import { OrderStatus } from '../../domain/enums/order-status.js';
import { PaymentMethod } from '../../domain/enums/payment-method.js';
import { PaymentStatus } from '../../domain/enums/payment-status.js';

import { UpdateOrderStatusInput } from '../contracts/inputs/update-order-status.input.js';
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

@Injectable()
export class UpdateOrderStatusUseCase {
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

    async execute(input: UpdateOrderStatusInput): Promise<OrderOutput> {
        const order = await this.unitOfWork.execute(async (transaction) => {
            const currentOrder = await this.orderRepository.findByIdForUpdate(
                transaction,
                input.orderId,
            );

            if (!currentOrder) {
                throw new OrderNotFoundError(input.orderId);
            }

            // Domain entity validates whether this transition is allowed.
            currentOrder.changeStatus(input.status);

            if (input.adminNote !== undefined) {
                currentOrder.updateAdminNote(input.adminNote);
            }

            if (
                input.status === OrderStatus.cancelled ||
                input.status === OrderStatus.delivered
            ) {
                const quantitiesByProductId = new Map<number, number>();

                for (const item of currentOrder.items) {
                    // A product may have been deleted after the order was created.
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

                // Lock inventory rows before changing reservations or stock.
                if (productIds.length > 0) {
                    await this.inventory.findByProductIdsForUpdate(
                        transaction,
                        productIds,
                    );
                }

                const items = [...quantitiesByProductId].map(
                    ([productId, quantity]) => ({ productId, quantity }),
                );
                if (input.status === OrderStatus.cancelled) {
                    await this.inventory.releaseReservation(
                        transaction,
                        items,
                        input.orderId,
                    );
                }

                if (input.status === OrderStatus.delivered) {
                    await this.inventory.fulfillReservation(
                        transaction,
                        items,
                        input.orderId,
                    );
                }
            }

            if (
                input.status === OrderStatus.delivered &&
                currentOrder.paymentMethod === PaymentMethod.cashOnDelivery
            ) {
                currentOrder.updatePaymentStatus(PaymentStatus.paid);
            }

            return this.orderRepository.save(transaction, currentOrder);
        });

        const output = OrderOutputMapper.toOutput(order);

        await this.notification.notifyOrderStatusChanged(output);

        return output;
    }
}
