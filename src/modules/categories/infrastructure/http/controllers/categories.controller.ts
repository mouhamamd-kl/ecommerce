import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiResponse } from '../../../../../common/helpers/api-response.js';
import { PublicCatalogCache } from '../../../../../performance/public-catalog-cache.js';
import { sendCatalog } from '../../../../../performance/catalog-http.js';

import { GetActiveCategoriesUseCase } from '../../../application/use-cases/get-active-categories.use-case.js';
import { GetActiveCategoryUseCase } from '../../../application/use-cases/get-active-category.use-case.js';

import { CategoryNotFoundError } from '../../../application/errors/category-not-found.error.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly getActiveCategoriesUseCase: GetActiveCategoriesUseCase,
    private readonly getActiveCategoryUseCase: GetActiveCategoryUseCase,
    private readonly catalogCache: PublicCatalogCache,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active categories' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Active categories retrieved successfully',
  })
  async findAll(@Res() response: Response) {
    try {
      return sendCatalog(response, await this.catalogCache.read(
        'categories', 'Categories retrieved successfully', () => this.getActiveCategoriesUseCase.execute(),
      ));
    } catch {
      return ApiResponse.sendResponseError(
        response,
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active category by ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      return sendCatalog(response, await this.catalogCache.read(
        `category:${id}`, 'Category retrieved successfully', () => this.getActiveCategoryUseCase.execute(id),
      ));
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        return ApiResponse.sendResponseError(
          response,
          error.message,
          HttpStatus.NOT_FOUND,
        );
      }

      return ApiResponse.sendResponseError(
        response,
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
