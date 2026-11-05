import { Injectable, Inject } from '@nestjs/common';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../ports/repositories/product-repository.port.js';

import { ProductNotFoundError } from '../errors/product-not-found.error.js';

@Injectable()
export class RemoveProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(id: number): Promise<void> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new ProductNotFoundError(id);
    }

    await this.productRepository.remove(id);
  }
}