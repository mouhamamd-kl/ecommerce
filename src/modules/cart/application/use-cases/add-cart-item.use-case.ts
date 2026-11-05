import { Injectable, Inject } from '@nestjs/common';

import { AddCartItemInput } from '../contracts/inputs/add-cart-item-input.js';

import {
  CART_REPOSITORY,
  type CartRepositoryPort,
} from '../ports/repositories/cart-repository.port.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/application/ports/repositories/product-repository.port.js';

import { Cart } from '../../domain/entities/cart.js';
import { CartItem } from '../../domain/entities/cart-item.js';

import { ProductNotAvailableError } from '../errors/product-not-available.error.js';
import { CartOutputMapper } from '../mappers/cart-output.mapper.js';
import { CartOutput } from '../contracts/outputs/cart-output.js';

@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepositoryPort,

    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    private readonly cartOutputMapper: CartOutputMapper,
  ) {}

  async execute(input: AddCartItemInput): Promise<CartOutput> {
    const product = await this.productRepository.findActiveById(
      input.productId,
    );

    if (!product) {
      throw new ProductNotAvailableError(input.productId);
    }

    let cart = await this.cartRepository.findByUserId(
      input.userId,
    );

    if (!cart) {
      cart = await this.cartRepository.create(
        new Cart(null, input.userId),
      );
    }

    if (cart.id === null) {
      throw new Error('Cart must be persisted before adding items');
    }

    const existingItem = cart.items.find(
      (item) => item.productId === input.productId,
    );

    if (existingItem) {
      existingItem.increaseQuantity(input.quantity);
    } else {
      cart.addItem(
        new CartItem(
          null,
          cart.id,
          input.productId,
          input.quantity,
        ),
      );
    }

    const savedCart = await this.cartRepository.save(cart);

    return this.cartOutputMapper.toOutput(savedCart);
  }
}