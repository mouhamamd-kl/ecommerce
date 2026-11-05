import { Inject, Injectable } from '@nestjs/common';

import { Inventory } from '../../domain/entities/inventory.js';

import { CreateInventoryInput } from '../contracts/inputs/create-inventory.input.js';
import { InventoryOutput } from '../contracts/outputs/inventory.output.js';

import { ProductNotFoundError } from '../../../products/application/errors/product-not-found.error.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/application/ports/repositories/product-repository.port.js';

import {
  INVENTORY_REPOSITORY,
  type InventoryReadModel,
  type InventoryRepositoryPort,
} from '../ports/repositories/inventory-repository.port.js';

import { InventoryAlreadyExistsError } from '../../domain/errors/inventory-already-exists.error.js';

import { InventoryOutputMapper } from '../mappers/inventory-output.mapper.js';

@Injectable()
export class CreateInventoryUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepositoryPort,

    private readonly outputMapper: InventoryOutputMapper,
  ) {}

  async execute(input: CreateInventoryInput): Promise<InventoryOutput> {
    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    if (await this.repository.existsByProductId(input.productId)) {
      throw new InventoryAlreadyExistsError();
    }

    const quantityOnHand = input.quantityOnHand ?? 0;
    const lowStockThreshold = input.lowStockThreshold ?? 5;

    const saved = await this.repository.create(
      new Inventory({
        id: null,
        productId: input.productId,
        quantityOnHand,
        quantityReserved: 0,
        lowStockThreshold,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const readModel = await this.repository.findByProductId(input.productId);

    return this.outputMapper.toOutput(
      readModel ??
        ({ inventory: saved, product: null } satisfies InventoryReadModel),
    );
  }
}
