import { AddCartItemDto } from '../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto.js';

import { AddCartItemInput } from '../../../application/contracts/inputs/add-cart-item-input.js';
import { UpdateCartItemInput } from '../../../application/contracts/inputs/update-cart-item-input.js';

export class CartHttpMapper {
  static toAddCartItemInput(
    userId: number,
    dto: AddCartItemDto,
  ): AddCartItemInput {
    return {
      userId,
      productId: dto.productId,
      quantity: dto.quantity,
    };
  }

  static toUpdateCartItemInput(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): UpdateCartItemInput {
    return {
      userId,
      itemId,
      quantity: dto.quantity,
    };
  }
}