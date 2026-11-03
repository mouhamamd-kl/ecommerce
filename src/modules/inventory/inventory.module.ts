import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inventory } from './entities/inventory.entity.js';
import { InventoryMovement } from './entities/inventory-movement.entity.js';
import { Product } from '../products/entities/product.entity.js';

import { InventoryService } from './inventory.service.js';
import { AdminInventoryController } from './admin-inventory.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryMovement,
      Product,
    ]),
  ],
  controllers: [
    AdminInventoryController,
  ],
  providers: [
    InventoryService,
  ],
  exports: [
    InventoryService,
    TypeOrmModule,
  ],
})
export class InventoryModule {}