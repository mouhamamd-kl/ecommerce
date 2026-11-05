import { Inject, Injectable } from '@nestjs/common';

import { Order } from '../../domain/entities/order.entity.js';
import { OrderItem } from '../../domain/entities/order-item.entity.js';

import { OrderStatus } from '../../domain/enums/order-status.js';
import { PaymentStatus } from '../../domain/enums/payment-status.js';

import { CreateOrderInput } from '../contracts/inputs/create-order.input.js';
import { OrderOutput } from '../contracts/outputs/order-output.js';

import { OrderOutputMapper } from '../mappers/order-output.mapper.js';

import {
    ORDER_REPOSITORY,
    type OrderRepositoryPort,
} from '../ports/repositories/order-repository.port.js';

import {
    CART_CHECKOUT,
    type CartCheckoutPort,
} from '../ports/services/cart-checkout.port.js';

import {
    PRODUCT_CATALOG,
    type ProductCatalogPort,
} from '../ports/services/product-catalog.port.js';

import {
    INVENTORY,
    type InventoryPort,
} from '../ports/services/inventory.port.js';

import {
    ORDER_NOTIFICATION,
    type NotificationPort,
} from '../ports/services/notification.port.js';

import {
    ORDER_UNIT_OF_WORK,
    type OrderUnitOfWorkPort,
} from '../ports/services/order-unit-of-work.port.js';

import { EmptyCartError } from '../errors/empty-cart.error.js';
import { UnavailableProductsError } from '../errors/unavailable-products.error.js';
import { InsufficientStockError } from '../errors/insufficient-stock.error.js';

@Injectable()
export class CreateOrderUseCase {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: OrderRepositoryPort,

        @Inject(CART_CHECKOUT)
        private readonly cartCheckout: CartCheckoutPort,

        @Inject(PRODUCT_CATALOG)
        private readonly productCatalog: ProductCatalogPort,

        @Inject(INVENTORY)
        private readonly inventory: InventoryPort,

        @Inject(ORDER_UNIT_OF_WORK)
        private readonly unitOfWork: OrderUnitOfWorkPort,

        @Inject(ORDER_NOTIFICATION)
        private readonly notification: NotificationPort,
    ) {}

    async execute(
        customerId: number,
        input: CreateOrderInput,
    ): Promise<OrderOutput> {
        const order = await this.unitOfWork.execute(async (transaction) => {
            const cartItems = await this.cartCheckout.getItemsForCheckout(
                transaction,
                customerId,
            );

            if (cartItems.length === 0) {
                throw new EmptyCartError();
            }

            const invalidCartItems = cartItems.filter(
                (item) =>
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1 ||
                    !Number.isInteger(item.productId) ||
                    item.productId < 1,
            );

            if (invalidCartItems.length > 0) {
                throw new Error('Cart contains invalid items.');
            }

            const productIds = [
                ...new Set(cartItems.map((item) => item.productId)),
            ];

            const products = await this.productCatalog.findActiveByIds(
                transaction,
                productIds,
            );

            const productsById = new Map(
                products.map((product) => [product.id, product]),
            );

            const unavailableProductIds = productIds.filter(
                (id) => !productsById.has(id),
            );

            if (unavailableProductIds.length > 0) {
                throw new UnavailableProductsError(unavailableProductIds);
            }

            const stocks = await this.inventory.findByProductIdsForUpdate(
                transaction,
                productIds,
            );

            const stocksByProductId = new Map(
                stocks.map((stock) => [stock.productId, stock]),
            );

            const quantitiesByProductId = new Map<number, number>();

            for (const item of cartItems) {
                const currentQuantity =
                    quantitiesByProductId.get(item.productId) ?? 0;

                quantitiesByProductId.set(
                    item.productId,
                    currentQuantity + item.quantity,
                );
            }

            for (const [
                productId,
                requestedQuantity,
            ] of quantitiesByProductId) {
                const stock = stocksByProductId.get(productId);

                if (!stock) {
                    throw new InsufficientStockError(
                        productId,
                        requestedQuantity,
                        0,
                        productsById.get(productId)?.name,
                    );
                }

                const availableQuantity =
                    stock.quantityOnHand - stock.quantityReserved;

                if (availableQuantity < requestedQuantity) {
                    throw new InsufficientStockError(
                        productId,
                        requestedQuantity,
                        availableQuantity,
                        productsById.get(productId)?.name,
                    );
                }
            }

            const orderItems = cartItems.map((cartItem) => {
                const product = productsById.get(cartItem.productId)!;

                return new OrderItem({
                    id: null,
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.price,
                    quantity: cartItem.quantity,
                });
            });

            const total = orderItems.reduce(
                (sum, item) => sum + item.subtotal,
                0,
            );

            const now = new Date();

            const newOrder = new Order({
                id: null,
                userId: customerId,
                items: orderItems,
                status: OrderStatus.pending,
                paymentStatus: PaymentStatus.pending,
                paymentMethod: input.paymentMethod,
                total,
                shippingAddress: input.shippingAddress,
                adminNote: null,
                createdAt: now,
                updatedAt: now,
            });

            const savedOrder = await this.orderRepository.save(
                transaction,
                newOrder,
            );

            if (savedOrder.id === null) {
                throw new Error('Saved order must have an ID.');
            }

            await this.inventory.reserve(
                transaction,
                [...quantitiesByProductId].map(([productId, quantity]) => ({
                    productId,
                    quantity,
                })),
                savedOrder.id,
            );

            await this.cartCheckout.clearCart(transaction, customerId);

            return savedOrder;
        });

        const output = OrderOutputMapper.toOutput(order);

        await this.notification.notifyOrderCreated(output);

        return output;
    }
}
