import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminJwtGuard } from '../../../../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../../../../common/helpers/api-response.js';

import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';
import { CategoryHttpMapper } from '../mappers/category-http.mapper.js';

import { CreateCategoryUseCase } from '../../../application/use-cases/create-category.use-case.js';
import { GetAllCategoriesUseCase } from '../../../application/use-cases/get-all-categories.use-case.js';
import { GetCategoryUseCase } from '../../../application/use-cases/get-category.use-case.js';
import { UpdateCategoryUseCase } from '../../../application/use-cases/update-category.use-case.js';
import { DeactivateCategoryUseCase } from '../../../application/use-cases/deactivate-category.use-case.js';
import { RemoveCategoryUseCase } from '../../../application/use-cases/remove-category.use-case.js';

import { CategoryNotFoundError } from '../../../application/errors/category-not-found.error.js';
import { CategoryNameConflictError } from '../../../application/errors/category-name-conflict.error.js';
import { InvalidCategoryNameError } from '../../../domain/errors/invalid-category-name.error.js';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getAllCategoriesUseCase: GetAllCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deactivateCategoryUseCase: DeactivateCategoryUseCase,
    private readonly removeCategoryUseCase: RemoveCategoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @SwaggerApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAll(@Res() response: Response) {
    try {
      const categories = await this.getAllCategoriesUseCase.execute();

      return ApiResponse.sendResponseSuccess(
        response,
        categories,
        'Categories retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      const category = await this.getCategoryUseCase.execute(id);

      return ApiResponse.sendResponseSuccess(
        response,
        category,
        'Category retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  async create(
    @Body() dto: CreateCategoryDto,
    @Res() response: Response,
  ) {
    try {
      const input = CategoryHttpMapper.toCreateInput(dto);
      const category = await this.createCategoryUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        category,
        'Category created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Res() response: Response,
  ) {
    try {
      const input = CategoryHttpMapper.toUpdateInput(id, dto);
      const category = await this.updateCategoryUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        category,
        'Category updated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a category' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      const category = await this.deactivateCategoryUseCase.execute(id);

      return ApiResponse.sendResponseSuccess(
        response,
        category,
        'Category deactivated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    try {
      await this.removeCategoryUseCase.execute(id);

      return ApiResponse.sendResponseSuccess(
        response,
        null,
        'Category deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  private handleError(response: Response, error: unknown) {
    if (error instanceof CategoryNotFoundError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof CategoryNameConflictError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.CONFLICT,
      );
    }

    if (error instanceof InvalidCategoryNameError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }

    return ApiResponse.sendResponseError(
      response,
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}