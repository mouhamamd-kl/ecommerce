import { Inject, Injectable } from '@nestjs/common';

import { InventoryNotFoundError } from '../../domain/errors/inventory-not-found.error.js';

import { AdjustStockInput } from '../contracts/inputs/adjust-stock.input.js';
import { InventoryOutput } from '../contracts/outputs/inventory.output.js';

import {
  INVENTORY_REPOSITORY,
  type InventoryRepositoryPort,
} from '../ports/repositories/inventory-repository.port.js';

import { InventoryOutputMapper } from '../mappers/inventory-output.mapper.js';

@Injectable()
export class AdjustStockUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepositoryPort,

    private readonly outputMapper: InventoryOutputMapper,
  ) {}

  async execute(input: AdjustStockInput): Promise<InventoryOutput> {
    await this.repository.adjustStock(input);

    // Legacy adjustStock re-read the record (with its product) afterwards.
    const readModel = await this.repository.findByProductId(input.productId);

    if (!readModel) {
      throw new InventoryNotFoundError(input.productId);
    }

    return this.outputMapper.toOutput(readModel);
  }
}
