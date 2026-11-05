import { Injectable, Inject } from '@nestjs/common';

import type { ProductOutput } from '../contracts/outputs/product-output.js';

import { ProductOutputMapper } from '../mappers/product-output.mapper.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../ports/repositories/product-repository.port.js';

@Injectable()
export class GetAllProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(): Promise<ProductOutput[]> {
    const products = await this.productRepository.findAll();

    return ProductOutputMapper.toOutputs(products);
  }
}