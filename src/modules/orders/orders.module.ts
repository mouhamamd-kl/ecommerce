import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// HTTP controllers
import { OrdersController } from './infrastructure/http/controllers/orders.controller.js';
import { AdminOrdersController } from './infrastructure/http/controllers/admin-orders.controller.js';

// Order ORM entities
import { OrderOrmEntity } from './infrastructure/persistence/entities/order.orm-entity.js';
import { OrderItemOrmEntity } from './infrastructure/persistence/entities/order-item.orm-entity.js';

// Entities referenced by the inventory adapter are registered by InventoryModule.

// Repository implementation
import { OrderTypeOrmRepository } from './infrastructure/persistence/repositories/order.typeorm-repository.js';

// Unit of work implementation
import { TypeOrmOrderUnitOfWork } from './infrastructure/persistence/typeorm-order-unit-of-work.js';

// Adapters
import { ProductCatalogTypeOrmAdapter } from './infrastructure/adapters/product-catalog.typeorm-adapter.js';
import { CartCheckoutTypeOrmAdapter } from './infrastructure/adapters/cart-checkout.typeorm-adapter.js';
import { InventoryTypeOrmAdapter } from './infrastructure/adapters/inventory.typeorm-adapter.js';
import { OrderNotificationAdapter } from './infrastructure/adapters/order-notification.adapter.js';

// Ports
import { ORDER_REPOSITORY } from './application/ports/repositories/order-repository.port.js';
import { PRODUCT_CATALOG } from './application/ports/services/product-catalog.port.js';
import { CART_CHECKOUT } from './application/ports/services/cart-checkout.port.js';
import { INVENTORY } from './application/ports/services/inventory.port.js';
import { ORDER_UNIT_OF_WORK } from './application/ports/services/order-unit-of-work.port.js';
import { ORDER_NOTIFICATION } from './application/ports/services/notification.port.js';

// Use cases
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case.js';
import { GetAllOrdersUseCase } from './application/use-cases/get-all-orders.use-case.js';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case.js';
import { GetCustomerOrdersUseCase } from './application/use-cases/get-customer-orders.use-case.js';
import { GetCustomerOrderUseCase } from './application/use-cases/get-customer-order.use-case.js';
import { UpdateOrderStatusUseCase } from './application/use-cases/update-order-status.use-case.js';
import { CancelCustomerOrderUseCase } from './application/use-cases/cancel-customer-order.use-case.js';

// Notification dependency
import { NotificationsModule } from '../notifications/notifications.module.js';
import { WarehouseGrpcModule } from '../inventory/infrastructure/grpc/warehouse-grpc.module.js';
import { InventoryBackendConfig } from '../inventory/infrastructure/grpc/inventory-backend.config.js';
import { WarehouseGrpcClient } from '../inventory/infrastructure/grpc/warehouse-grpc.client.js';
import { InventoryGrpcAdapter } from './infrastructure/adapters/inventory.grpc-adapter.js';
import { OrderInventoryReservationOrmEntity } from './infrastructure/persistence/entities/order-inventory-reservation.orm-entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderOrmEntity,
      OrderItemOrmEntity,
      OrderInventoryReservationOrmEntity,
    ]),
    NotificationsModule,
    WarehouseGrpcModule,
  ],

  controllers: [OrdersController, AdminOrdersController],

  providers: [
    // Repository implementation and port binding
    OrderTypeOrmRepository,
    {
      provide: ORDER_REPOSITORY,
      useExisting: OrderTypeOrmRepository,
    },

    // Unit of work implementation and port binding
    TypeOrmOrderUnitOfWork,
    {
      provide: ORDER_UNIT_OF_WORK,
      useExisting: TypeOrmOrderUnitOfWork,
    },

    // Adapters and port bindings
    ProductCatalogTypeOrmAdapter,
    {
      provide: PRODUCT_CATALOG,
      useExisting: ProductCatalogTypeOrmAdapter,
    },

    CartCheckoutTypeOrmAdapter,
    {
      provide: CART_CHECKOUT,
      useExisting: CartCheckoutTypeOrmAdapter,
    },

    {
      provide: INVENTORY,
      inject: [InventoryBackendConfig, WarehouseGrpcClient],
      useFactory: (
        config: InventoryBackendConfig,
        client: WarehouseGrpcClient,
      ) =>
        config.driver === 'grpc'
          ? new InventoryGrpcAdapter(client)
          : new InventoryTypeOrmAdapter(),
    },

    OrderNotificationAdapter,
    {
      provide: ORDER_NOTIFICATION,
      useExisting: OrderNotificationAdapter,
    },

    // Use cases
    CreateOrderUseCase,
    GetAllOrdersUseCase,
    GetOrderUseCase,
    GetCustomerOrdersUseCase,
    GetCustomerOrderUseCase,
    UpdateOrderStatusUseCase,
    CancelCustomerOrderUseCase,
  ],

  exports: [ORDER_REPOSITORY],
})
export class OrdersModule {}
