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

import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { AdminJwtGuard } from '../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin / Products')
@ApiBearerAuth('access-token')
@Controller('admin/products')
@UseGuards(AdminJwtGuard)
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  /**
   * GET /admin/products
   * List all products, including inactive products.
   */
  @Get()
  async findAll(@Res() response: Response) {
    const products = await this.productsService.findAll();

    return ApiResponse.sendResponseSuccess(
      response,
      products,
      'Products retrieved successfully',
      200,
    );
  }

  /**
   * GET /admin/products/:id
   * Retrieve a product, including inactive products.
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const product = await this.productsService.findById(id);

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
  async create(
    @Body() dto: CreateProductDto,
    @Res() response: Response,
  ) {
    const product = await this.productsService.create(dto);

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
    const product = await this.productsService.update(id, dto);

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
    const product = await this.productsService.deactivate(id);

    return ApiResponse.sendResponseSuccess(
      response,
      product,
      'Product deactivated successfully',
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
    await this.productsService.remove(id);

    return ApiResponse.sendResponseSuccess(
      response,
      null,
      'Product deleted successfully',
      200,
    );
  }
}