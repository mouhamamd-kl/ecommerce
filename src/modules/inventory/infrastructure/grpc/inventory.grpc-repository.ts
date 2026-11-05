import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { randomUUID } from 'node:crypto';
import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/application/ports/repositories/product-repository.port.js';
import type { AdjustStockInput } from '../../application/contracts/inputs/adjust-stock.input.js';
import type {
  InventoryMovementReadModel,
  InventoryReadModel,
  InventoryRepositoryPort,
} from '../../application/ports/repositories/inventory-repository.port.js';
import type { Inventory } from '../../domain/entities/inventory.js';
import { InventoryAlreadyExistsError } from '../../domain/errors/inventory-already-exists.error.js';
import { InventoryNotFoundError } from '../../domain/errors/inventory-not-found.error.js';
import { InsufficientStockError } from '../../domain/errors/insufficient-stock.error.js';
import { WarehouseGrpcClient } from './warehouse-grpc.client.js';
import {
  inventoryFromGrpc,
  movementFromGrpc,
} from './inventory-grpc.mapper.js';
import { grpcErrorCode, warehouseException } from './warehouse-grpc.errors.js';
import type { WarehouseInventory } from './warehouse-grpc.contract.js';

@Injectable()
export class InventoryGrpcRepository implements InventoryRepositoryPort {
  constructor(
    @Inject(WarehouseGrpcClient) private readonly client: WarehouseGrpcClient,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepositoryPort,
  ) {}

  async create(inventory: Inventory): Promise<Inventory> {
    try {
      return inventoryFromGrpc(
        await this.client.call('createInventory', {
          productId: inventory.productId,
          quantityOnHand: inventory.quantityOnHand,
          lowStockThreshold: inventory.lowStockThreshold,
        }),
      );
    } catch (error) {
      if (grpcErrorCode(error) === status.ALREADY_EXISTS)
        throw new InventoryAlreadyExistsError();
      throw warehouseException(error);
    }
  }

  async adjustStock(input: AdjustStockInput): Promise<Inventory> {
    try {
      return inventoryFromGrpc(
        await this.client.call('adjustStock', {
          ...input,
          reason: input.reason.trim(),
          referenceId: '',
          idempotencyKey: `ecommerce:adjust:${randomUUID()}`,
        }),
      );
    } catch (error) {
      if (grpcErrorCode(error) === status.NOT_FOUND)
        throw new InventoryNotFoundError(input.productId);
      if (grpcErrorCode(error) === status.FAILED_PRECONDITION) {
        const stock = await this.findByProductId(input.productId);
        throw new InsufficientStockError(
          input.productId,
          input.quantity,
          stock?.inventory.availableQuantity ?? 0,
        );
      }
      throw warehouseException(error);
    }
  }

  async findAll(): Promise<InventoryReadModel[]> {
    return this.list('getAllInventory');
  }

  async findLowStock(): Promise<InventoryReadModel[]> {
    return this.list('getLowStock');
  }

  async findByProductId(productId: number): Promise<InventoryReadModel | null> {
    try {
      return this.readModel(
        await this.client.call('getInventory', { productId }),
      );
    } catch (error) {
      if (grpcErrorCode(error) === status.NOT_FOUND) return null;
      throw warehouseException(error);
    }
  }

  async existsByProductId(productId: number): Promise<boolean> {
    return (await this.findByProductId(productId)) !== null;
  }

  async findMovements(
    productId?: number,
  ): Promise<InventoryMovementReadModel[]> {
    // The warehouse contract requires a product ID for movement queries.
    const inventory =
      productId === undefined
        ? await this.findAll()
        : [await this.findByProductId(productId)].filter(
            (item): item is InventoryReadModel => item !== null,
          );
    const result: InventoryMovementReadModel[] = [];
    try {
      for (const model of inventory) {
        let count = 0;
        for (let page = 1; ; page++) {
          const response = await this.client.call('getMovements', {
            productId: model.inventory.productId,
            page,
            limit: 100,
          });
          result.push(
            ...response.items.map((item) => ({
              movement: movementFromGrpc(item),
              inventory: model.inventory,
            })),
          );
          count += response.items.length;
          if (count >= response.total) break;
          if (response.items.length === 0)
            throw new BadGatewayException(
              'Warehouse movement pagination made no progress.',
            );
        }
      }
    } catch (error) {
      throw warehouseException(error);
    }
    return result.sort(
      (a, b) => b.movement.createdAt.getTime() - a.movement.createdAt.getTime(),
    );
  }

  private async list(
    method: 'getAllInventory' | 'getLowStock',
  ): Promise<InventoryReadModel[]> {
    const result: InventoryReadModel[] = [];
    try {
      for (let page = 1; ; page++) {
        const response = await this.client.call(method, { page, limit: 100 });
        result.push(
          ...(await Promise.all(
            response.items.map((item) => this.readModel(item)),
          )),
        );
        if (result.length >= response.total) break;
        if (response.items.length === 0)
          throw new BadGatewayException(
            'Warehouse inventory pagination made no progress.',
          );
      }
    } catch (error) {
      throw warehouseException(error);
    }
    return result;
  }

  private async readModel(
    item: WarehouseInventory,
  ): Promise<InventoryReadModel> {
    const product = await this.products.findById(item.productId);
    return {
      inventory: inventoryFromGrpc(item),
      product: product
        ? {
            id: product.id!,
            name: product.name,
            price: product.price,
            isActive: product.isActive,
          }
        : null,
    };
  }
}
