import { Inject, Injectable } from '@nestjs/common';

import { InventoryOutput } from '../contracts/outputs/inventory.output.js';
import { InventoryOutputMapper } from '../mappers/inventory-output.mapper.js';

import {
  INVENTORY_REPOSITORY,
  type InventoryRepositoryPort,
} from '../ports/repositories/inventory-repository.port.js';

@Injectable()
export class GetLowStockInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepositoryPort,

    private readonly outputMapper: InventoryOutputMapper,
  ) {}

  async execute(): Promise<InventoryOutput[]> {
    const readModels = await this.repository.findLowStock();

    return this.outputMapper.toOutputs(readModels);
  }
}
