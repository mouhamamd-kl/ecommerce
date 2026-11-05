import {
  Body,
  Controller,
  Get,
  HttpStatus,
  HttpException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../../../../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../../../../common/helpers/api-response.js';

import { CreateInventoryDto } from '../dtos/create-inventory.dto.js';
import { AdjustStockDto } from '../dtos/adjust-stock.dto.js';
import { InventoryHttpMapper } from '../mappers/inventory-http.mapper.js';

import { CreateInventoryUseCase } from '../../../application/use-cases/create-inventory.use-case.js';
import { GetAllInventoryUseCase } from '../../../application/use-cases/get-all-inventory.use-case.js';
import { GetInventoryUseCase } from '../../../application/use-cases/get-inventory.use-case.js';
import { GetLowStockInventoryUseCase } from '../../../application/use-cases/get-low-stock-inventory.use-case.js';
import { AdjustStockUseCase } from '../../../application/use-cases/adjust-stock.use-case.js';
import { GetInventoryMovementsUseCase } from '../../../application/use-cases/get-inventory-movements.use-case.js';

import { InventoryNotFoundError } from '../../../domain/errors/inventory-not-found.error.js';
import { InventoryAlreadyExistsError } from '../../../domain/errors/inventory-already-exists.error.js';
import { InsufficientStockError } from '../../../domain/errors/insufficient-stock.error.js';
import { ProductNotFoundError } from '../../../../products/application/errors/product-not-found.error.js';

@ApiTags('Admin / Inventory')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(
    private readonly createInventoryUseCase: CreateInventoryUseCase,
    private readonly getAllInventoryUseCase: GetAllInventoryUseCase,
    private readonly getInventoryUseCase: GetInventoryUseCase,
    private readonly getLowStockInventoryUseCase: GetLowStockInventoryUseCase,
    private readonly adjustStockUseCase: AdjustStockUseCase,
    private readonly getInventoryMovementsUseCase: GetInventoryMovementsUseCase,
  ) {}

  /**
   * GET /admin/inventory
   */
  @Get()
  async findAll(@Res() response: Response) {
    try {
      const inventory = await this.getAllInventoryUseCase.execute();

      return ApiResponse.sendResponseSuccess(
        response,
        inventory,
        'Inventory retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * GET /admin/inventory/low-stock
   * Keep this static route before :productId.
   */
  @Get('low-stock')
  async findLowStock(@Res() response: Response) {
    try {
      const inventory = await this.getLowStockInventoryUseCase.execute();

      return ApiResponse.sendResponseSuccess(
        response,
        inventory,
        'Low-stock inventory retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * GET /admin/inventory/movements
   * Optional query: ?productId=12
   */
  @Get('movements')
  async findMovements(
    @Query('productId') productId: string | undefined,
    @Res() response: Response,
  ) {
    try {
      const input = InventoryHttpMapper.toListMovementsInput(productId);

      const movements = await this.getInventoryMovementsUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        movements,
        'Inventory movements retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * POST /admin/inventory
   * Initialize inventory for an existing product.
   */
  @Post()
  async create(@Body() dto: CreateInventoryDto, @Res() response: Response) {
    try {
      const input = InventoryHttpMapper.toCreateInput(dto);

      const inventory = await this.createInventoryUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        inventory,
        'Inventory created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * GET /admin/inventory/:productId
   */
  @Get(':productId')
  async findByProductId(
    @Param('productId', ParseIntPipe) productId: number,
    @Res() response: Response,
  ) {
    try {
      const inventory = await this.getInventoryUseCase.execute(productId);

      return ApiResponse.sendResponseSuccess(
        response,
        inventory,
        'Inventory retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * PATCH /admin/inventory/:productId
   * Add or remove physical stock.
   */
  @Patch(':productId')
  async adjustStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: AdjustStockDto,
    @Res() response: Response,
  ) {
    try {
      const input = InventoryHttpMapper.toAdjustStockInput(productId, dto);

      const inventory = await this.adjustStockUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        inventory,
        'Inventory updated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  private handleError(response: Response, error: unknown) {
    if (error instanceof HttpException) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        error.getStatus(),
      );
    }
    if (error instanceof InventoryNotFoundError) {
      return ApiResponse.sendResponseError(
        response,
        'Inventory not found for this product',
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof InventoryAlreadyExistsError) {
      return ApiResponse.sendResponseError(
        response,
        'Inventory already exists for this product',
        HttpStatus.CONFLICT,
      );
    }

    if (error instanceof InsufficientStockError) {
      return ApiResponse.sendResponseError(
        response,
        'Cannot remove more stock than is available',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof ProductNotFoundError) {
      return ApiResponse.sendResponseError(
        response,
        'Product not found',
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
