import { Injectable } from '@nestjs/common';
import { Inventory } from '../../../domain/entities/inventory.js';
import { InventoryMovement } from '../../../domain/entities/inventory-movement.js';
import { InventoryMovementType } from '../../../domain/enums/inventory-movement-type.enum.js';
import { InventoryNotFoundError } from '../../../domain/errors/inventory-not-found.error.js';
import type { AdjustStockInput } from '../../../application/contracts/inputs/adjust-stock.input.js';

import { DataSource, Repository } from 'typeorm';

import {
  InventoryRepositoryPort,
  InventoryReadModel,
  InventoryMovementReadModel,
  InventoryTransactionContext,
} from '../../../application/ports/repositories/inventory-repository.port.js';

import { InventoryOrmEntity } from '../entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from '../entities/inventory-movement.orm-entity.js';

import { InventoryMapper } from '../mappers/inventory.mapper.js';

import { TypeOrmInventoryTransactionContext } from '../typeorm-inventory-transaction-context.js';

@Injectable()
export class InventoryTypeOrmRepository implements InventoryRepositoryPort {
  private readonly repository: Repository<InventoryOrmEntity>;

  private readonly movementsRepository: Repository<InventoryMovementOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(InventoryOrmEntity);
    this.movementsRepository = this.dataSource.getRepository(
      InventoryMovementOrmEntity,
    );
  }

  async findAll(): Promise<InventoryReadModel[]> {
    const inventory = await this.repository.find({
      relations: { product: true },
      order: { id: 'DESC' },
    });

    return inventory.map((orm) => InventoryMapper.toReadModel(orm));
  }

  async findByProductId(productId: number): Promise<InventoryReadModel | null> {
    const inventory = await this.repository.findOne({
      where: { productId },
      relations: { product: true },
    });

    return inventory ? InventoryMapper.toReadModel(inventory) : null;
  }

  async findLowStock(): Promise<InventoryReadModel[]> {
    const inventory = await this.repository.find({
      relations: { product: true },
      order: { quantityOnHand: 'ASC' },
    });

    return inventory
      .filter((item) => item.availableQuantity <= item.lowStockThreshold)
      .map((orm) => InventoryMapper.toReadModel(orm));
  }

  async existsByProductId(productId: number): Promise<boolean> {
    const count = await this.repository.count({
      where: { productId },
    });

    return count > 0;
  }

  async findMovements(
    productId?: number,
  ): Promise<InventoryMovementReadModel[]> {
    if (productId !== undefined) {
      const inventory = await this.repository.findOne({
        where: { productId },
      });

      if (!inventory) {
        return [];
      }

      const movements = await this.movementsRepository.find({
        where: { inventoryId: inventory.id },
        relations: { inventory: true },
        order: { createdAt: 'DESC' },
      });

      return movements.map((movement) =>
        InventoryMapper.toMovementReadModel(movement),
      );
    }

    const movements = await this.movementsRepository.find({
      relations: { inventory: true },
      order: { createdAt: 'DESC' },
    });

    return movements.map((movement) =>
      InventoryMapper.toMovementReadModel(movement),
    );
  }

  async create(inventory: Inventory): Promise<Inventory> {
    return this.transact(async (transaction) => {
      const saved = await transaction.save(inventory);
      if (saved.id === null)
        throw new Error('Saved inventory must have an ID.');
      if (saved.quantityOnHand > 0) {
        await transaction.recordMovement(
          new InventoryMovement({
            id: null,
            inventoryId: saved.id,
            type: InventoryMovementType.stockAdded,
            quantity: saved.quantityOnHand,
            quantityBefore: 0,
            quantityAfter: saved.quantityOnHand,
            reason: 'Initial inventory',
            referenceOrderId: null,
            createdAt: new Date(),
          }),
        );
      }
      return saved;
    });
  }

  async adjustStock(input: AdjustStockInput): Promise<Inventory> {
    return this.transact(async (transaction) => {
      const inventory = await transaction.findByProductIdForUpdate(
        input.productId,
      );
      if (!inventory) throw new InventoryNotFoundError(input.productId);
      const adjusted =
        input.operation === 'add'
          ? inventory.addStock(input.quantity)
          : inventory.removeStock(input.quantity);
      const saved = await transaction.save(adjusted);
      if (saved.id === null)
        throw new Error('Saved inventory must have an ID.');
      await transaction.recordMovement(
        new InventoryMovement({
          id: null,
          inventoryId: saved.id,
          type:
            input.operation === 'add'
              ? InventoryMovementType.stockAdded
              : InventoryMovementType.stockRemoved,
          quantity: input.quantity,
          quantityBefore: inventory.quantityOnHand,
          quantityAfter: saved.quantityOnHand,
          reason: input.reason.trim(),
          referenceOrderId: null,
          createdAt: new Date(),
        }),
      );
      return saved;
    });
  }

  private async transact<T>(
    work: (transaction: InventoryTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) =>
      work(new TypeOrmInventoryTransactionContext(manager)),
    );
  }
}
