import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ProductsService } from './products.service.js';
import { ApiResponse } from '../../common/helpers/api-response.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  /**
   * GET /products
   * List active products.
   */
  @Get()
  async findActive(@Res() response: Response) {
    const products = await this.productsService.findActive();

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
    const product = await this.productsService.findActiveById(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product retrieved successfully',
      200,
    );
  }
}