import { Injectable, Inject } from '@nestjs/common';

import {
  CART_REPOSITORY,
  type CartRepositoryPort,
} from '../ports/repositories/cart-repository.port.js';

import { CartItemNotFoundError } from '../errors/cart-item-not-found.error.js';
import { CartOutputMapper } from '../mappers/cart-output.mapper.js';
import { CartOutput } from '../contracts/outputs/cart-output.js';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepositoryPort,

    private readonly cartOutputMapper: CartOutputMapper,
  ) {}

  async execute(
    userId: number,
    itemId: number,
  ): Promise<CartOutput> {
    const cart = await this.cartRepository.findByUserId(userId);

    const item = cart?.items.find(
      (cartItem) => cartItem.id === itemId,
    );

    if (!cart || !item) {
      throw new CartItemNotFoundError(itemId);
    }

    cart.removeItem(itemId);

    const savedCart = await this.cartRepository.save(cart);

    return this.cartOutputMapper.toOutput(savedCart);
  }
}