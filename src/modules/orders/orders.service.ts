import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
} from 'typeorm';

import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Cart } from '../cart/entities/cart.entity.js';
import { Inventory } from '../inventory/entities/inventory.entity.js';
import { CreateNotificationUseCase } from '../notifications/application/use-cases/create-notification.use-case.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  type OrderStatusType,
} from './order-status.js';
import { CartItem } from '../cart/entities/cart-item.entity.js';
import { NotificationRecipientType } from '../notifications/domain/enums/notification-recipient-type.enum.js';
import { NotificationType } from '../notifications/domain/enums/notification-type.enum.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly dataSource: DataSource,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) { }

  /**
   * Create an order from the customer's cart.
   */
  async create(
    userId: number,
    dto: CreateOrderDto,
  ): Promise<Order> {
    const orderId = await this.dataSource.transaction(
      async (manager) => {
        const cartRepository = manager.getRepository(Cart);
        const cartItemRepository = manager.getRepository(CartItem);
        const productRepository = manager.getRepository(Product);
        const inventoryRepository = manager.getRepository(Inventory);
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);

        const cart = await cartRepository.findOne({
          where: { userId },
          relations: { items: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!cart || !cart.items?.length) {
          throw new BadRequestException('Your cart is empty');
        }

        const productIds = [
          ...new Set(cart.items.map((item) => item.productId)),
        ];

        const products = await productRepository.find({
          where: {
            id: In(productIds),
            isActive: true,
          },
        });

        if (products.length !== productIds.length) {
          throw new BadRequestException(
            'One or more products are unavailable',
          );
        }

        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );

        const inventoryRows = await inventoryRepository.find({
          where: { productId: In(productIds) },
          lock: { mode: 'pessimistic_write' },
        });

        const inventoryMap = new Map(
          inventoryRows.map((item) => [item.productId, item]),
        );

        let total = 0;

        const orderItems = cart.items.map((cartItem) => {
          const product = productMap.get(cartItem.productId);
          const inventory = inventoryMap.get(cartItem.productId);

          if (!product || !inventory) {
            throw new BadRequestException(
              `Product ${cartItem.productId} is unavailable`,
            );
          }

          if (
            !Number.isInteger(cartItem.quantity) ||
            cartItem.quantity < 1
          ) {
            throw new BadRequestException(
              'Cart contains an invalid quantity',
            );
          }

          const available =
            inventory.quantityOnHand - inventory.quantityReserved;

          if (available < cartItem.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}`,
            );
          }

          const unitPrice = Number(product.price);
          const subtotal = Number(
            (unitPrice * cartItem.quantity).toFixed(2),
          );

          total += subtotal;

          return {
            product,
            inventory,
            productName: product.name,
            unitPrice,
            quantity: cartItem.quantity,
            subtotal,
          };
        });

        const order = orderRepository.create({
          userId,
          status: OrderStatus.pending,
          paymentStatus: PaymentStatus.pending,
          paymentMethod: dto.paymentMethod,
          shippingAddress: dto.shippingAddress.trim(),
          total: Number(total.toFixed(2)),
          adminNote: null,
        });

        const savedOrder = await orderRepository.save(order);

        const savedItems = orderItems.map((item) =>
          orderItemRepository.create({
            orderId: savedOrder.id,
            productId: item.product.id,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }),
        );

        await orderItemRepository.save(savedItems);

        // Reserve stock. A later fulfillment step can deduct physical stock.
        for (const item of orderItems) {
          item.inventory.quantityReserved += item.quantity;
          await inventoryRepository.save(item.inventory);
        }

        await cartItemRepository.delete({
          cartId: cart.id,
        });
        await this.createNotificationUseCase.execute({
          recipientType: NotificationRecipientType.customer,
          recipientId: userId,
          type: NotificationType.orderCreated,
          title: 'Order received',
          message: `Your order #${order.id} has been received.`,
          relatedOrderId: order.id,
        });
        return savedOrder.id;
      },
    );

    return this.findByIdForCustomer(userId, orderId);
  }

  /**
   * List orders belonging to one customer.
   */
  async findAllForCustomer(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a customer's order without exposing another customer's order.
   */
  async findByIdForCustomer(
    userId: number,
    id: number,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Admin: list every order.
   */
  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Admin: retrieve any order by ID.
   */
  async findById(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Admin: change an order's status.
   */
  async updateStatus(
    id: number,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const allowedTransitions: Record<
      OrderStatusType,
      OrderStatusType[]
    > = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const inventoryRepository = manager.getRepository(Inventory);
      const orderItemRepository = manager.getRepository(OrderItem);

      const order = await orderRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (
        order.status !== dto.status &&
        !allowedTransitions[order.status].includes(dto.status)
      ) {
        throw new BadRequestException(
          `Cannot change order status from "${order.status}" to "${dto.status}"`,
        );
      }

      if (
        dto.status === OrderStatus.delivered &&
        order.paymentMethod === PaymentMethod.online &&
        order.paymentStatus !== PaymentStatus.paid
      ) {
        throw new BadRequestException(
          'Online payment must be completed before delivery',
        );
      }

      // Release reserved stock when an order is cancelled.
      if (
        dto.status === OrderStatus.cancelled &&
        order.status !== OrderStatus.cancelled
      ) {
        const items = await orderItemRepository.find({
          where: { orderId: order.id },
        });

        const productIds = items
          .map((item) => item.productId)
          .filter((id): id is number => id !== null);

        const inventoryRows = productIds.length
          ? await inventoryRepository.find({
            where: { productId: In(productIds) },
            lock: { mode: 'pessimistic_write' },
          })
          : [];

        const inventoryMap = new Map(
          inventoryRows.map((item) => [item.productId, item]),
        );

        for (const item of items) {
          if (item.productId === null) continue;

          const inventory = inventoryMap.get(item.productId);

          if (!inventory) continue;

          inventory.quantityReserved = Math.max(
            0,
            inventory.quantityReserved - item.quantity,
          );

          await inventoryRepository.save(inventory);
        }
      }

      if (dto.status === OrderStatus.delivered) {
        const items = await orderItemRepository.find({
          where: { orderId: order.id },
        });

        const productIds = items
          .map((item) => item.productId)
          .filter((id): id is number => id !== null);

        const inventoryRows = productIds.length
          ? await inventoryRepository.find({
            where: { productId: In(productIds) },
            lock: { mode: 'pessimistic_write' },
          })
          : [];

        const inventoryMap = new Map(
          inventoryRows.map((item) => [item.productId, item]),
        );

        for (const item of items) {
          if (item.productId === null) continue;

          const inventory = inventoryMap.get(item.productId);

          if (!inventory) continue;

          if (
            inventory.quantityReserved < item.quantity ||
            inventory.quantityOnHand < item.quantity
          ) {
            throw new BadRequestException(
              'Inventory is inconsistent for this order',
            );
          }

          inventory.quantityReserved -= item.quantity;
          inventory.quantityOnHand -= item.quantity;

          await inventoryRepository.save(inventory);
        }

        if (order.paymentMethod === PaymentMethod.cashOnDelivery) {
          order.paymentStatus = PaymentStatus.paid;
        }
      }

      order.status = dto.status;

      if (dto.adminNote !== undefined) {
        order.adminNote = dto.adminNote;
      }

      await orderRepository.save(order);
    });

    return this.findById(id);
  }

  /**
   * Customer: cancel their own order before shipment.
   */
  async cancelForCustomer(
    userId: number,
    id: number,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      ![OrderStatus.pending, OrderStatus.confirmed].includes(
        order.status as 'pending' | 'confirmed',
      )
    ) {
      throw new BadRequestException(
        'This order can no longer be cancelled by the customer',
      );
    }

    return this.updateStatus(id, {
      status: OrderStatus.cancelled,
    });
  }
}