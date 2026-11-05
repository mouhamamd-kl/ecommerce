// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';

// import { Cart } from './entities/cart.entity.js';
// import { CartItem } from './entities/cart-item.entity.js';
// import { Product } from '../products/entities/product.entity.js';

// import { CartService } from './cart.service.js';
// import { CartController } from './cart.controller.js';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       Cart,
//       CartItem,
//       Product,
//     ]),
//   ],
//   controllers: [CartController],
//   providers: [CartService],
//   exports: [
//     CartService,
//     TypeOrmModule,
//   ],
// })
// export class CartModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from '../products/products.module.js';
import { User } from '../users/entities/user.entity.js';

import { ProductOrmEntity } from '../products/infrastructure/persistence/entities/product.orm-entity.js';

import { CartOrmEntity } from './infrastructure/persistence/entities/cart.orm-entity.js';
import { CartItemOrmEntity } from './infrastructure/persistence/entities/cart-item.orm-entity.js';

import { CartTypeOrmRepository } from './infrastructure/persistence/repositories/cart.typeorm-repository.js';
import { CART_REPOSITORY } from './application/ports/repositories/cart-repository.port.js';

import { CartOutputMapper } from './application/mappers/cart-output.mapper.js';

import { GetCartUseCase } from './application/use-cases/get-cart.use-case.js';
import { AddCartItemUseCase } from './application/use-cases/add-cart-item.use-case.js';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case.js';
import { RemoveCartItemUseCase } from './application/use-cases/remove-cart-item.use-case.js';
import { ClearCartUseCase } from './application/use-cases/clear-cart.use-case.js';

import { CartController } from './infrastructure/http/controllers/cart.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CartOrmEntity,
      CartItemOrmEntity,
      ProductOrmEntity,
      User,
    ]),
    ProductsModule,
  ],

  controllers: [
    CartController,
  ],

  providers: [
    CartTypeOrmRepository,

    {
      provide: CART_REPOSITORY,
      useExisting: CartTypeOrmRepository,
    },

    CartOutputMapper,

    GetCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
  ],

  exports: [
    CART_REPOSITORY,
  ],
})
export class CartModule {}