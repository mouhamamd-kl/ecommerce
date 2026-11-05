import { Cart } from '../../../domain/entities/cart.js';
import { CartItem } from '../../../domain/entities/cart-item.js';

import { CartOrmEntity } from '../entities/cart.orm-entity.js';
import { CartItemOrmEntity } from '../entities/cart-item.orm-entity.js';

export class CartPersistenceMapper {
  static toDomain(
    cartOrm: CartOrmEntity,
    itemOrms: CartItemOrmEntity[] = [],
  ): Cart {
    const items = itemOrms.map(
      (itemOrm) =>
        new CartItem(
          itemOrm.id,
          itemOrm.cartId,
          itemOrm.productId,
          itemOrm.quantity,
        ),
    );

    return new Cart(
      cartOrm.id,
      cartOrm.userId,
      items,
      cartOrm.createdAt,
      cartOrm.updatedAt,
    );
  }

  static toOrm(cart: Cart): CartOrmEntity {
    const cartOrm = new CartOrmEntity();

    if (cart.id !== null) {
      cartOrm.id = cart.id;
    }

    cartOrm.userId = cart.userId;

    return cartOrm;
  }

  static itemToOrm(
    item: CartItem,
  ): CartItemOrmEntity {
    const itemOrm = new CartItemOrmEntity();

    if (item.id !== null) {
      itemOrm.id = item.id;
    }

    itemOrm.cartId = item.cartId;
    itemOrm.productId = item.productId;
    itemOrm.quantity = item.quantity;

    return itemOrm;
  }
}