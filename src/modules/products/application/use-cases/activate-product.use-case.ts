import { Injectable, Inject } from '@nestjs/common';

import type { ProductOutput } from '../contracts/outputs/product-output.js';

import { ProductOutputMapper } from '../mappers/product-output.mapper.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../ports/repositories/product-repository.port.js';

import { ProductNotFoundError } from '../errors/product-not-found.error.js';

@Injectable()
export class ActivateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(id: number): Promise<ProductOutput> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new ProductNotFoundError(id);
    }

    const updatedProduct = product.activate();

    await this.productRepository.save(updatedProduct);

    return ProductOutputMapper.toOutput(updatedProduct);
  }
}