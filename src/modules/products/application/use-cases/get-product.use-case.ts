import { Injectable, Inject } from '@nestjs/common';

import type { AdminProductOutput } from '../contracts/outputs/admin-product-output.js';

import { ProductOutputMapper } from '../mappers/product-output.mapper.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../ports/repositories/product-repository.port.js';

import { ProductNotFoundError } from '../errors/product-not-found.error.js';
import {
  PRODUCT_INVENTORY,
  type ProductInventoryPort,
} from '../ports/services/product-inventory.port.js';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    @Inject(PRODUCT_INVENTORY)
    private readonly inventory: ProductInventoryPort,
  ) {}

  async execute(id: number): Promise<AdminProductOutput> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new ProductNotFoundError(id);
    }

    return {
      ...ProductOutputMapper.toOutput(product),
      inventory: await this.inventory.findByProductId(id),
    };
  }
}
