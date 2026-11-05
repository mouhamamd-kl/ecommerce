import { Inject, Injectable } from '@nestjs/common';

import { InventoryNotFoundError } from '../../domain/errors/inventory-not-found.error.js';

import { ListMovementsInput } from '../contracts/inputs/list-movements.input.js';
import { InventoryMovementOutput } from '../contracts/outputs/inventory-movement.output.js';

import {
  INVENTORY_REPOSITORY,
  type InventoryRepositoryPort,
} from '../ports/repositories/inventory-repository.port.js';

import { InventoryOutputMapper } from '../mappers/inventory-output.mapper.js';

@Injectable()
export class GetInventoryMovementsUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepositoryPort,

    private readonly outputMapper: InventoryOutputMapper,
  ) {}

  async execute(
    input: ListMovementsInput,
  ): Promise<InventoryMovementOutput[]> {
    // Legacy validated inventory existence before listing movements.
    if (input.productId !== undefined) {
      const existing = await this.repository.findByProductId(input.productId);

      if (!existing) {
        throw new InventoryNotFoundError(input.productId);
      }
    }

    const readModels = await this.repository.findMovements(input.productId);

    return this.outputMapper.toMovementOutputs(readModels);
  }
}
