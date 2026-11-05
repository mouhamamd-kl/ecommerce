import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// HTTP controller
import { AdminInventoryController } from './infrastructure/http/controllers/admin-inventory.controller.js';

// Inventory ORM entities
import { InventoryOrmEntity } from './infrastructure/persistence/entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from './infrastructure/persistence/entities/inventory-movement.orm-entity.js';

// Repository implementation
import { InventoryTypeOrmRepository } from './infrastructure/persistence/repositories/inventory.typeorm-repository.js';

// Port
import { INVENTORY_REPOSITORY } from './application/ports/repositories/inventory-repository.port.js';

// Output mapper
import { InventoryOutputMapper } from './application/mappers/inventory-output.mapper.js';

// Use cases
import { CreateInventoryUseCase } from './application/use-cases/create-inventory.use-case.js';
import { GetAllInventoryUseCase } from './application/use-cases/get-all-inventory.use-case.js';
import { GetInventoryUseCase } from './application/use-cases/get-inventory.use-case.js';
import { GetLowStockInventoryUseCase } from './application/use-cases/get-low-stock-inventory.use-case.js';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case.js';
import { GetInventoryMovementsUseCase } from './application/use-cases/get-inventory-movements.use-case.js';

// Product dependency (PRODUCT_REPOSITORY)
import { ProductsModule } from '../products/products.module.js';
import { WarehouseGrpcModule } from './infrastructure/grpc/warehouse-grpc.module.js';
import { InventoryBackendConfig } from './infrastructure/grpc/inventory-backend.config.js';
import { InventoryGrpcRepository } from './infrastructure/grpc/inventory.grpc-repository.js';
import { WarehouseGrpcClient } from './infrastructure/grpc/warehouse-grpc.client.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../products/application/ports/repositories/product-repository.port.js';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryOrmEntity, InventoryMovementOrmEntity]),
    ProductsModule,
    WarehouseGrpcModule,
  ],

  controllers: [AdminInventoryController],

  providers: [
    // Repository implementation and port binding
    {
      provide: INVENTORY_REPOSITORY,
      inject: [
        InventoryBackendConfig,
        DataSource,
        WarehouseGrpcClient,
        PRODUCT_REPOSITORY,
      ],
      useFactory: (
        config: InventoryBackendConfig,
        dataSource: DataSource,
        client: WarehouseGrpcClient,
        products: ProductRepositoryPort,
      ) =>
        config.driver === 'grpc'
          ? new InventoryGrpcRepository(client, products)
          : new InventoryTypeOrmRepository(dataSource),
    },

    // Output mapper
    InventoryOutputMapper,

    // Use cases
    CreateInventoryUseCase,
    GetAllInventoryUseCase,
    GetInventoryUseCase,
    GetLowStockInventoryUseCase,
    AdjustStockUseCase,
    GetInventoryMovementsUseCase,
  ],
})
export class InventoryModule {}
