import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { Cart } from '../../../domain/entities/cart.js';
import { CartItem } from '../../../domain/entities/cart-item.js';

import { CartRepositoryPort } from '../../../application/ports/repositories/cart-repository.port.js';

import { CartOrmEntity } from '../entities/cart.orm-entity.js';
import { CartItemOrmEntity } from '../entities/cart-item.orm-entity.js';
import { CartPersistenceMapper } from '../mappers/cart.persistence.mapper.js';

@Injectable()
export class CartTypeOrmRepository
  implements CartRepositoryPort
{
  constructor(
    @InjectRepository(CartOrmEntity)
    private readonly cartRepository: Repository<CartOrmEntity>,

    @InjectRepository(CartItemOrmEntity)
    private readonly cartItemRepository: Repository<CartItemOrmEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async findByUserId(
    userId: number,
  ): Promise<Cart | null> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
    });

    if (!cart) {
      return null;
    }

    const items = await this.cartItemRepository.find({
      where: { cartId: cart.id },
      order: { createdAt: 'ASC' },
    });

    return CartPersistenceMapper.toDomain(cart, items);
  }

  async findByUserIdForUpdate(
    userId: number,
  ): Promise<Cart | null> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(CartOrmEntity);
      const itemRepository = manager.getRepository(CartItemOrmEntity);

      const cart = await cartRepository.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        return null;
      }

      const items = await itemRepository.find({
        where: { cartId: cart.id },
        order: { createdAt: 'ASC' },
      });

      return CartPersistenceMapper.toDomain(cart, items);
    });
  }

  async create(cart: Cart): Promise<Cart> {
    const cartOrm = CartPersistenceMapper.toOrm(cart);

    const savedCart = await this.cartRepository.save(cartOrm);

    return CartPersistenceMapper.toDomain(savedCart);
  }

  async save(cart: Cart): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(CartOrmEntity);
      const itemRepository = manager.getRepository(CartItemOrmEntity);

      let cartOrm = await cartRepository.findOne({
        where: { userId: cart.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cartOrm) {
        throw new Error(
          `Cart for user ${cart.userId} was not found`,
        );
      }

      const existingItems = await itemRepository.find({
        where: { cartId: cartOrm.id },
      });

      const domainItems = cart.items;

      const existingIds = new Set(
        domainItems
          .filter((item) => item.id !== null)
          .map((item) => item.id),
      );

      const itemsToRemove = existingItems.filter(
        (item) => !existingIds.has(item.id),
      );

      if (itemsToRemove.length > 0) {
        await itemRepository.remove(itemsToRemove);
      }

      for (const item of domainItems) {
        const itemOrm = CartPersistenceMapper.itemToOrm(item);

        itemOrm.cartId = cartOrm.id;

        await itemRepository.save(itemOrm);
      }

      const savedItems = await itemRepository.find({
        where: { cartId: cartOrm.id },
        order: { createdAt: 'ASC' },
      });

      cartOrm = await cartRepository.findOneOrFail({
        where: { id: cartOrm.id },
      });

      return CartPersistenceMapper.toDomain(
        cartOrm,
        savedItems,
      );
    });
  }

  async removeItem(
    cartId: number,
    itemId: number,
  ): Promise<void> {
    await this.cartItemRepository.delete({
      id: itemId,
      cartId,
    });
  }

  async clearItems(cartId: number): Promise<void> {
    await this.cartItemRepository.delete({
      cartId,
    });
  }
}