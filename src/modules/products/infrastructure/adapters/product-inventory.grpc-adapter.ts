import { Inject, Injectable } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import type {
  ProductInventoryPort,
  ProductInventorySnapshot,
} from '../../application/ports/services/product-inventory.port.js';
import { WarehouseGrpcClient } from '../../../inventory/infrastructure/grpc/warehouse-grpc.client.js';
import {
  grpcErrorCode,
  warehouseException,
} from '../../../inventory/infrastructure/grpc/warehouse-grpc.errors.js';

@Injectable()
export class ProductInventoryGrpcAdapter implements ProductInventoryPort {
  constructor(
    @Inject(WarehouseGrpcClient) private readonly client: WarehouseGrpcClient,
  ) {}

  async findByProductId(
    productId: number,
  ): Promise<ProductInventorySnapshot | null> {
    try {
      const inventory = await this.client.call('getInventory', { productId });
      return {
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        availableQuantity: inventory.availableQuantity,
        lowStockThreshold: inventory.lowStockThreshold,
        isLowStock: inventory.isLowStock,
      };
    } catch (error) {
      if (grpcErrorCode(error) === status.NOT_FOUND) return null;
      throw warehouseException(error);
    }
  }
}
