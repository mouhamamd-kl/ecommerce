import { BadRequestException } from '@nestjs/common';

import type { CreateInventoryDto } from '../dtos/create-inventory.dto.js';
import type { AdjustStockDto } from '../dtos/adjust-stock.dto.js';

import type { CreateInventoryInput } from '../../../application/contracts/inputs/create-inventory.input.js';
import type { AdjustStockInput } from '../../../application/contracts/inputs/adjust-stock.input.js';
import type { ListMovementsInput } from '../../../application/contracts/inputs/list-movements.input.js';

export class InventoryHttpMapper {
  static toCreateInput(dto: CreateInventoryDto): CreateInventoryInput {
    return {
      productId: dto.productId,
      quantityOnHand: dto.quantityOnHand,
      lowStockThreshold: dto.lowStockThreshold,
    };
  }

  static toAdjustStockInput(
    productId: number,
    dto: AdjustStockDto,
  ): AdjustStockInput {
    return {
      productId,
      operation: dto.operation,
      quantity: dto.quantity,
      reason: dto.reason,
    };
  }

  static toListMovementsInput(productId: string | undefined): ListMovementsInput {
    if (productId === undefined) {
      return {};
    }

    const parsedProductId = Number(productId);

    if (!Number.isSafeInteger(parsedProductId) || parsedProductId < 1) {
      throw new BadRequestException(
        'productId must be a positive integer',
      );
    }

    return { productId: parsedProductId };
  }
}
