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

import { ApiResponse } from '../../../../../common/helpers/api-response.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly getAllActiveProducts: GetAllActiveProductsUseCase,
    private readonly getActiveProduct: GetActiveProductUseCase,
  ) {}

  /**
   * GET /products
   * List active products.
   */
  @Get()
  async findActive(@Res() response: Response) {
    const products = await this.getAllActiveProducts.execute();

    return ApiResponse.sendResponseSuccess(
      response,
      products,
      'Products retrieved successfully',
      200,
    );
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
    const product = await this.getActiveProduct.execute(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product retrieved successfully',
      200,
    );
  }
}