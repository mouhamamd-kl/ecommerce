import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InventoryOrmEntity } from '../inventory/infrastructure/persistence/entities/inventory.orm-entity.js';
import { WarehouseGrpcModule } from '../inventory/infrastructure/grpc/warehouse-grpc.module.js';
import { WarehouseGrpcClient } from '../inventory/infrastructure/grpc/warehouse-grpc.client.js';
import { InventoryBackendConfig } from '../inventory/infrastructure/grpc/inventory-backend.config.js';
import { PRODUCT_INVENTORY } from './application/ports/services/product-inventory.port.js';
import { ProductInventoryGrpcAdapter } from './infrastructure/adapters/product-inventory.grpc-adapter.js';
import { ProductInventoryTypeOrmAdapter } from './infrastructure/adapters/product-inventory.typeorm-adapter.js';

// HTTP controllers
import { ProductsController } from './infrastructure/http/controllers/product.controller.js';
import { AdminProductsController } from './infrastructure/http/controllers/admin-products.controller.js';

// ORM entities
import { ProductOrmEntity } from './infrastructure/persistence/entities/product.orm-entity.js';
import { ProductPhotoOrmEntity } from './infrastructure/persistence/entities/product-photo.orm-entity.js';

// Repository implementation
import { ProductTypeOrmRepository } from './infrastructure/persistence/repositories/product.typeorm-repository.js';

// Repository port
import { PRODUCT_REPOSITORY } from './application/ports/repositories/product-repository.port.js';

// Use cases
import { ActivateProductUseCase } from './application/use-cases/activate-product.use-case.js';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { DeactivateProductUseCase } from './application/use-cases/deactivate-product.use-case.js';
import { GetActiveProductUseCase } from './application/use-cases/get-active-product.use-case.js';
import { GetAllActiveProductsUseCase } from './application/use-cases/get-all-active-products.use-case.js';
import { GetAllProductsUseCase } from './application/use-cases/get-all-products.use-case.js';
import { GetProductUseCase } from './application/use-cases/get-product.use-case.js';
import { RemoveProductUseCase } from './application/use-cases/remove-product.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';

// Category dependency
import { CategoryValidationTypeOrmAdapter } from './infrastructure/adapters/category-validation.typeorm-adapter.js';
import { CATEGORY_VALIDATION } from './application/ports/services/category-validation.port.js';

// Category dependency
import { CategoriesModule } from '../categories/categories.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductOrmEntity,
      ProductPhotoOrmEntity,
      InventoryOrmEntity,
    ]),
    CategoriesModule,
    WarehouseGrpcModule,
  ],

  controllers: [ProductsController, AdminProductsController],

  providers: [
    // Repository implementation
    ProductTypeOrmRepository,

    // Repository port binding
    {
      provide: PRODUCT_REPOSITORY,
      useExisting: ProductTypeOrmRepository,
    },

    // Category validation implementation and port binding
    CategoryValidationTypeOrmAdapter,
    {
      provide: CATEGORY_VALIDATION,
      useExisting: CategoryValidationTypeOrmAdapter,
    },

    // Use cases
    {
      provide: PRODUCT_INVENTORY,
      inject: [InventoryBackendConfig, DataSource, WarehouseGrpcClient],
      useFactory: (
        config: InventoryBackendConfig,
        dataSource: DataSource,
        client: WarehouseGrpcClient,
      ) =>
        config.driver === 'grpc'
          ? new ProductInventoryGrpcAdapter(client)
          : new ProductInventoryTypeOrmAdapter(dataSource),
    },

    ActivateProductUseCase,
    CreateProductUseCase,
    DeactivateProductUseCase,
    GetActiveProductUseCase,
    GetAllActiveProductsUseCase,
    GetAllProductsUseCase,
    GetProductUseCase,
    RemoveProductUseCase,
    UpdateProductUseCase,
  ],

  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
