import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateProductUseCase } from '../../../application/use-cases/create-product.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/update-product.use-case.js';
import { GetAllProductsUseCase } from '../../../application/use-cases/get-all-products.use-case.js';
import { GetProductUseCase } from '../../../application/use-cases/get-product.use-case.js';
import { DeactivateProductUseCase } from '../../../application/use-cases/deactivate-product.use-case.js';
import { ActivateProductUseCase } from '../../../application/use-cases/activate-product.use-case.js';
import { RemoveProductUseCase } from '../../../application/use-cases/remove-product.use-case.js';

import { CreateProductDto } from '../dtos/create-product.dto.js';
import { UpdateProductDto } from '../dtos/update-product.dto.js';

import { ProductHttpMapper } from '../mappers/product-http.mapper.js';

import { AdminJwtGuard } from '../../../../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../../../../common/helpers/api-response.js';

@ApiTags('Admin / Products')
@ApiBearerAuth('access-token')
@Controller('admin/products')
@UseGuards(AdminJwtGuard)
export class AdminProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly getAllProducts: GetAllProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly deactivateProduct: DeactivateProductUseCase,
    private readonly activateProduct: ActivateProductUseCase,
    private readonly removeProduct: RemoveProductUseCase,
  ) {}

  /**
   * GET /admin/products
   * List all products, including inactive products.
   */
  @Get()
  async findAll(@Res() response: Response) {
    const products = await this.getAllProducts.execute();

    return ApiResponse.sendResponseSuccess(
      response,
      products,
      'Products retrieved successfully',
      200,
    );
  }

  /**
   * GET /admin/products/:id
   * Retrieve a product, including inactive products and current stock availability.
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const product = await this.getProduct.execute(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product retrieved successfully',
      200,
    );
  }

  /**
   * POST /admin/products
   * Create a product with categories and optional photos.
   */
  @Post()
  async create(@Body() dto: CreateProductDto, @Res() response: Response) {
    const input = ProductHttpMapper.toCreateInput(dto);

    const product = await this.createProduct.execute(input);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product created successfully',
      201,
    );
  }

  /**
   * PATCH /admin/products/:id
   * Update product details, categories, and/or photos.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Res() response: Response,
  ) {
    const input = ProductHttpMapper.toUpdateInput(dto);

    const product = await this.updateProduct.execute(id, input);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product updated successfully',
      200,
    );
  }

  /**
   * PATCH /admin/products/:id/deactivate
   * Deactivate a product without deleting it.
   */
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const product = await this.deactivateProduct.execute(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product deactivated successfully',
      200,
    );
  }

  /**
   * PATCH /admin/products/:id/activate
   * Activate a previously deactivated product.
   */
  @Patch(':id/activate')
  async activate(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const product = await this.activateProduct.execute(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product activated successfully',
      200,
    );
  }

  /**
   * DELETE /admin/products/:id
   * Permanently delete a product.
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    await this.removeProduct.execute(id);

    return ApiResponse.sendResponseSuccess(
      response,
      null,
      'Product deleted successfully',
      200,
    );
  }
}
