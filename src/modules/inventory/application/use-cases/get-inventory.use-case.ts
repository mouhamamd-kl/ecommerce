import { Inject, Injectable } from '@nestjs/common';

import { InventoryNotFoundError } from '../../domain/errors/inventory-not-found.error.js';

import { InventoryOutput } from '../contracts/outputs/inventory.output.js';
import { InventoryOutputMapper } from '../mappers/inventory-output.mapper.js';

import {
  INVENTORY_REPOSITORY,
  type InventoryRepositoryPort,
} from '../ports/repositories/inventory-repository.port.js';

@Injectable()
export class GetInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepositoryPort,

    private readonly outputMapper: InventoryOutputMapper,
  ) {}

  async execute(productId: number): Promise<InventoryOutput> {
    const readModel = await this.repository.findByProductId(productId);

    if (!readModel) {
      throw new InventoryNotFoundError(productId);
    }

    return this.outputMapper.toOutput(readModel);
  }
}
