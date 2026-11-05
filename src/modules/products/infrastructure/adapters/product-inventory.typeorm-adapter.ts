import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ProductInventoryPort,
  ProductInventorySnapshot,
} from '../../application/ports/services/product-inventory.port.js';
import { InventoryOrmEntity } from '../../../inventory/infrastructure/persistence/entities/inventory.orm-entity.js';

@Injectable()
export class ProductInventoryTypeOrmAdapter implements ProductInventoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async findByProductId(
    productId: number,
  ): Promise<ProductInventorySnapshot | null> {
    const inventory = await this.dataSource
      .getRepository(InventoryOrmEntity)
      .findOneBy({ productId });
    if (!inventory) return null;

    return {
      quantityOnHand: inventory.quantityOnHand,
      quantityReserved: inventory.quantityReserved,
      availableQuantity: inventory.availableQuantity,
      lowStockThreshold: inventory.lowStockThreshold,
      isLowStock: inventory.availableQuantity <= inventory.lowStockThreshold,
    };
  }
}
