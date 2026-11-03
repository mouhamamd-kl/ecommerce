import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cart } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';

import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [
    CartService,
    TypeOrmModule,
  ],
})
export class CartModule {}