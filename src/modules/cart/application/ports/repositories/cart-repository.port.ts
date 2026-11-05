import { Cart } from '../../../domain/entities/cart.js';

export interface CartRepositoryPort {
  findByUserId(userId: number): Promise<Cart | null>;

  findByUserIdForUpdate(userId: number): Promise<Cart | null>;

  create(cart: Cart): Promise<Cart>;

  save(cart: Cart): Promise<Cart>;

  removeItem(cartId: number, itemId: number): Promise<void>;

  clearItems(cartId: number): Promise<void>;
}

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');