import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';

import { InventoryService } from './inventory.service.js';
import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { AdminJwtGuard } from '../../core/auth/admin/admin-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin / Inventory')
@ApiBearerAuth('access-token')
@Controller('admin/inventory')
@UseGuards(AdminJwtGuard)
export class AdminInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * GET /admin/inventory
   */
  @Get()
  async findAll(@Res() response: Response) {
    const inventory = await this.inventoryService.findAll();

    return ApiResponse.sendResponseSuccess(
      response,
      inventory,
      'Inventory retrieved successfully',
      200,
    );
  }

  /**
   * GET /admin/inventory/low-stock
   * Keep this static route before :productId.
   */
  @Get('low-stock')
  async findLowStock(@Res() response: Response) {
    const inventory = await this.inventoryService.findLowStock();

    return ApiResponse.sendResponseSuccess(
      response,
      inventory,
      'Low-stock inventory retrieved successfully',
      200,
    );
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
    let parsedProductId: number | undefined;

    if (productId !== undefined) {
      parsedProductId = Number(productId);

      if (
        !Number.isSafeInteger(parsedProductId) ||
        parsedProductId < 1
      ) {
        throw new BadRequestException(
          'productId must be a positive integer',
        );
      }
    }

    const movements = await this.inventoryService.findMovements(
      parsedProductId,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      movements,
      'Inventory movements retrieved successfully',
      200,
    );
  }

  /**
   * POST /admin/inventory
   * Initialize inventory for an existing product.
   */
  @Post()
  async create(
    @Body() dto: CreateInventoryDto,
    @Res() response: Response,
  ) {
    const inventory = await this.inventoryService.create(dto);

    return ApiResponse.sendResponseSuccess(
      response,
      inventory,
      'Inventory created successfully',
      201,
    );
  }

  /**
   * GET /admin/inventory/:productId
   */
  @Get(':productId')
  async findByProductId(
    @Param('productId', ParseIntPipe) productId: number,
    @Res() response: Response,
  ) {
    const inventory =
      await this.inventoryService.findByProductId(productId);

    return ApiResponse.sendResponseSuccess(
      response,
      inventory,
      'Inventory retrieved successfully',
      200,
    );
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
    const inventory = await this.inventoryService.adjustStock(
      productId,
      dto,
    );

    return ApiResponse.sendResponseSuccess(
      response,
      inventory,
      'Inventory updated successfully',
      200,
    );
  }
}