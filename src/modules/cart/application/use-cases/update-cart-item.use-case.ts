import { Injectable, Inject } from '@nestjs/common';

import { UpdateCartItemInput } from '../contracts/inputs/update-cart-item-input.js';

import {
  CART_REPOSITORY,
  type CartRepositoryPort,
} from '../ports/repositories/cart-repository.port.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/application/ports/repositories/product-repository.port.js';

import { CartItemNotFoundError } from '../errors/cart-item-not-found.error.js';
import { ProductNotAvailableError } from '../errors/product-not-available.error.js';

import { CartOutputMapper } from '../mappers/cart-output.mapper.js';
import { CartOutput } from '../contracts/outputs/cart-output.js';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepositoryPort,

    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    private readonly cartOutputMapper: CartOutputMapper,
  ) {}

  async execute(
    input: UpdateCartItemInput,
  ): Promise<CartOutput> {
    const cart = await this.cartRepository.findByUserId(
      input.userId,
    );

    const item = cart?.items.find(
      (cartItem) => cartItem.id === input.itemId,
    );

    if (!cart || !item) {
      throw new CartItemNotFoundError(input.itemId);
    }

    const product = await this.productRepository.findActiveById(
      item.productId,
    );

    if (!product) {
      throw new ProductNotAvailableError(item.productId);
    }

    item.changeQuantity(input.quantity);

    const savedCart = await this.cartRepository.save(cart);

    return this.cartOutputMapper.toOutput(savedCart);
  }
}