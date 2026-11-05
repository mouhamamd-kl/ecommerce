import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { CartOrmEntity } from '../../../cart/infrastructure/persistence/entities/cart.orm-entity.js';
import { CartItemOrmEntity } from '../../../cart/infrastructure/persistence/entities/cart-item.orm-entity.js';

import {
  CartCheckoutPort,
  CartCheckoutItem,
} from '../../application/ports/services/cart-checkout.port.js';

import { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';

import { TypeOrmOrderTransactionContext } from '../persistence/typeorm-order-transaction-context.js';

@Injectable()
export class CartCheckoutTypeOrmAdapter implements CartCheckoutPort {
  private getManager(
    transaction: OrderTransactionContext,
  ): EntityManager {
    if (!(transaction instanceof TypeOrmOrderTransactionContext)) {
      throw new Error('Invalid order transaction context.');
    }

    return transaction.manager;
  }

  async getItemsForCheckout(
    transaction: OrderTransactionContext,
    customerId: number,
  ): Promise<CartCheckoutItem[]> {
    const manager = this.getManager(transaction);

    const cartRepository = manager.getRepository(CartOrmEntity);
    const cartItemRepository = manager.getRepository(CartItemOrmEntity);

    const cart = await cartRepository.findOne({
      where: {
        userId: customerId,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!cart) {
      return [];
    }

    const items = await cartItemRepository.find({
      where: {
        cartId: cart.id,
      },
      order: {
        id: 'ASC',
      },
    });

    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  }

  async clearCart(
    transaction: OrderTransactionContext,
    customerId: number,
  ): Promise<void> {
    const manager = this.getManager(transaction);

    const cartRepository = manager.getRepository(CartOrmEntity);
    const cartItemRepository = manager.getRepository(CartItemOrmEntity);

    const cart = await cartRepository.findOne({
      where: {
        userId: customerId,
      },
    });

    if (!cart) {
      return;
    }

    await cartItemRepository.delete({
      cartId: cart.id,
    });
  }
}