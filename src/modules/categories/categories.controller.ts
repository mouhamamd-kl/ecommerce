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
import {
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service.js';
import { ApiResponse } from '../../common/helpers/api-response.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) { }

  @ApiOperation({
    summary: 'List active categories',
    description: 'Public endpoint. Returns only categories with isActive=true.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @Get()
  async findActive(@Res() response: Response) {
    const categories = await this.categoriesService.findActive();

    return ApiResponse.sendResponseSuccess(
      response,
      categories,
      'Categories retrieved successfully',
      200,
    );
  }

  @ApiOperation({
    summary: 'Get an active category by ID',
    description: 'Public endpoint. Returns the category only if it is active.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Category ID' })
  @SwaggerApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Category not found or inactive' })
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const category = await this.categoriesService.findByIdActive(id);

    return ApiResponse.sendResponseSuccess(
      response,
      category,
      'Category retrieved successfully',
      200,
    );
  }
}