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
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { AdminJwtGuard } from '../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';

@ApiTags('Admin / Categories')
@ApiBearerAuth('access-token')
@Controller('admin/categories')
@UseGuards(AdminJwtGuard)
export class AdminCategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @ApiOperation({
    summary: 'List all categories (including inactive)',
    description: 'Admin-only. Returns every category regardless of active state.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Get()
  async findAll(@Res() response: Response) {
    const categories = await this.categoriesService.findAll();

    return ApiResponse.sendResponseSuccess(
      response,
      categories,
      'Categories retrieved successfully',
      200,
    );
  }

  @ApiOperation({
    summary: 'Get a category by ID',
    description: 'Admin-only. Returns the category even if inactive.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Category ID' })
  @SwaggerApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Category not found' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const category = await this.categoriesService.findById(id);

    return ApiResponse.sendResponseSuccess(
      response,
      category,
      'Category retrieved successfully',
      200,
    );
  }

  @ApiOperation({
    summary: 'Create a category',
    description: 'Admin-only. Creates a new category.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @SwaggerApiResponse({ status: 201, description: 'Category created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Validation failed' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Post()
  async create(
    @Body() dto: CreateCategoryDto,
    @Res() response: Response,
  ) {
    const category = await this.categoriesService.create(dto);

    return ApiResponse.sendResponseSuccess(
      response,
      category,
      'Category created successfully',
      201,
    );
  }

  @ApiOperation({
    summary: 'Update a category',
    description: 'Admin-only. Partially updates a category.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @SwaggerApiResponse({ status: 200, description: 'Category updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Validation failed' })
  @SwaggerApiResponse({ status: 404, description: 'Category not found' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Res() response: Response,
  ) {
    const category = await this.categoriesService.update(id, dto);

    return ApiResponse.sendResponseSuccess(
      response,
      category,
      'Category updated successfully',
      200,
    );
  }

  @ApiOperation({
    summary: 'Deactivate a category',
    description: 'Admin-only. Sets isActive=false without deleting the category.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Category ID' })
  @SwaggerApiResponse({ status: 200, description: 'Category deactivated successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Category not found' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const category = await this.categoriesService.deactivate(id);

    return ApiResponse.sendResponseSuccess(
      response,
      category,
      'Category deactivated successfully',
      200,
    );
  }

  @ApiOperation({
    summary: 'Delete a category',
    description: 'Admin-only. Permanently deletes the category.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1, description: 'Category ID' })
  @SwaggerApiResponse({ status: 200, description: 'Category deleted successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Category not found' })
  @SwaggerApiResponse({ status: 401, description: 'Missing or invalid admin token' })
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    await this.categoriesService.remove(id);

    return ApiResponse.sendResponseSuccess(
      response,
      null,
      'Category deleted successfully',
      200,
    );
  }
}