import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './entities/product.entity.js';
import { ProductPhoto } from './entities/product-photo.entity.js';
import { Category } from '../categories/entities/category.entity.js';

import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { AdminProductsController } from './admin-products.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductPhoto,
      Category,
    ]),
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}