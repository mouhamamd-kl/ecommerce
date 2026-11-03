import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';

import { Product } from '../products/entities/product.entity.js';
import { Cart } from '../cart/entities/cart.entity.js';
import { Inventory } from '../inventory/entities/inventory.entity.js';

import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { AdminOrdersController } from './admin-orders.controlller.js';
import { CartItem } from '../cart/entities/cart-item.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      Cart,
      CartItem,
      Inventory,
    ]),
    NotificationsModule,
  ],
  controllers: [
    OrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }