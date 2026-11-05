import { EntityManager } from 'typeorm';

import { Inventory } from '../../domain/entities/inventory.js';
import { InventoryMovement } from '../../domain/entities/inventory-movement.js';

import {
  InventoryTransactionContext,
} from '../../application/ports/repositories/inventory-repository.port.js';

import { InventoryOrmEntity } from './entities/inventory.orm-entity.js';
import { InventoryMovementOrmEntity } from './entities/inventory-movement.orm-entity.js';

import { InventoryMapper } from './mappers/inventory.mapper.js';

export class TypeOrmInventoryTransactionContext
  implements InventoryTransactionContext
{
  constructor(private readonly manager: EntityManager) {}

  async findByProductIdForUpdate(
    productId: number,
  ): Promise<Inventory | null> {
    const orm = await this.manager
      .getRepository(InventoryOrmEntity)
      .findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

    return orm ? InventoryMapper.toDomain(orm) : null;
  }

  async save(inventory: Inventory): Promise<Inventory> {
    const repository = this.manager.getRepository(InventoryOrmEntity);

    const saved = await repository.save(InventoryMapper.toOrm(inventory));

    return InventoryMapper.toDomain(saved);
  }

  async recordMovement(movement: InventoryMovement): Promise<void> {
    const repository = this.manager.getRepository(InventoryMovementOrmEntity);

    await repository.save(InventoryMapper.toMovementOrm(movement));
  }
}
