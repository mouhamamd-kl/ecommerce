import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

import { GetAllActiveProductsUseCase } from '../../../application/use-cases/get-all-active-products.use-case.js';
import { GetActiveProductUseCase } from '../../../application/use-cases/get-active-product.use-case.js';

import { PublicCatalogCache } from '../../../../../performance/public-catalog-cache.js';
import { sendCatalog } from '../../../../../performance/catalog-http.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly getAllActiveProducts: GetAllActiveProductsUseCase,
    private readonly getActiveProduct: GetActiveProductUseCase,
    private readonly catalogCache: PublicCatalogCache,
  ) {}

  /**
   * GET /products
   * List active products.
   */
  @Get()
  async findActive(@Res() response: Response) {
    return sendCatalog(response, await this.catalogCache.read(
      'products', 'Products retrieved successfully', () => this.getAllActiveProducts.execute(),
    ));
  }

  /**
   * GET /products/:id
   * Retrieve one active product.
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    return sendCatalog(response, await this.catalogCache.read(
      `product:${id}`, 'Product retrieved successfully', () => this.getActiveProduct.execute(id),
    ));
  }
}
