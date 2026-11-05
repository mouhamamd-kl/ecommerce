import { Injectable, Inject } from '@nestjs/common';

import { Cart } from '../../domain/entities/cart.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../../../products/application/ports/repositories/product-repository.port.js';

import { CartOutput } from '../contracts/outputs/cart-output.js';
import { CartItemOutput } from '../contracts/outputs/cart-item-output.js';

@Injectable()
export class CartOutputMapper {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async toOutput(cart: Cart): Promise<CartOutput> {
    if (cart.id === null) {
      throw new Error('Cannot map an unsaved cart to output');
    }

    const items = await Promise.all(
      cart.items.map((item) => this.mapItem(item)),
    );

    const total = items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      itemCount: items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      total: Number(total.toFixed(2)),
      createdAt: cart.createdAt ?? new Date(),
      updatedAt: cart.updatedAt ?? new Date(),
    };
  }

  private async mapItem(
    item: Cart['items'][number],
  ): Promise<CartItemOutput> {
    const product = await this.productRepository.findById(
      item.productId,
    );

    if (!product) {
      return {
        id: item.id ?? 0,
        productId: item.productId,
        quantity: item.quantity,
        product: null,
        subtotal: 0,
      };
    }

    const price = Number(product.price);

    return {
      id: item.id ?? 0,
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: product.id ?? item.productId,
        name: product.name,
        price,
        isActive: product.isActive,
      },
      subtotal: Number((price * item.quantity).toFixed(2)),
    };
  }
}