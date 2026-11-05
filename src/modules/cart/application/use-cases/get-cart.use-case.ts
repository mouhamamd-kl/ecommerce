import { Injectable, Inject } from '@nestjs/common';

import {
  CART_REPOSITORY,
  type CartRepositoryPort,
} from '../ports/repositories/cart-repository.port.js';

import { Cart } from '../../domain/entities/cart.js';
import { CartOutputMapper } from '../mappers/cart-output.mapper.js';
import { CartOutput } from '../contracts/outputs/cart-output.js';

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepositoryPort,

    private readonly cartOutputMapper: CartOutputMapper,
  ) {}

  async execute(userId: number): Promise<CartOutput> {
    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      cart = await this.cartRepository.create(
        new Cart(null, userId),
      );
    }

    return this.cartOutputMapper.toOutput(cart);
  }
}