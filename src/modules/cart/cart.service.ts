import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cart } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';

import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Find the customer's cart or create one.
   */
  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });

      try {
        cart = await this.cartRepository.save(cart);
      } catch {
        // Another request may have created the cart concurrently.
        cart = await this.cartRepository.findOne({
          where: { userId },
        });

        if (!cart) {
          throw new BadRequestException(
            'Could not create the shopping cart',
          );
        }
      }
    }

    return cart;
  }

  /**
   * Return the cart with item subtotals and the overall total.
   */
  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    const items = await this.cartItemRepository.find({
      where: { cartId: cart.id },
      relations: { product: true },
      order: { createdAt: 'ASC' },
    });

    const cartItems = items.map((item) => {
      const price = Number(item.product.price);

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price,
          isActive: item.product.isActive,
        },
        subtotal: price * item.quantity,
      };
    });

    const total = cartItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    const itemCount = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: cartItems,
      itemCount,
      total: Number(total.toFixed(2)),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Add a product or increase its quantity if already in the cart.
   */
  async addItem(userId: number, dto: AddCartItemDto) {
    const product = await this.productRepository.findOne({
      where: {
        id: dto.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or is no longer available',
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cartId: cart.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      existingItem.quantity += dto.quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      const item = this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
      });

      await this.cartItemRepository.save(item);
    }

    return this.getCart(userId);
  }

  /**
   * Set the quantity of an existing cart item.
   */
  async updateItem(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      relations: { product: true },
    });

    if (!item) {
      throw new NotFoundException(
        'Cart item not found',
      );
    }

    if (!item.product.isActive) {
      throw new BadRequestException(
        'This product is no longer available',
      );
    }

    item.quantity = dto.quantity;

    await this.cartItemRepository.save(item);

    return this.getCart(userId);
  }

  /**
   * Remove a single item from the customer's cart.
   */
  async removeItem(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Cart item not found',
      );
    }

    await this.cartItemRepository.remove(item);

    return this.getCart(userId);
  }

  /**
   * Empty the customer's cart.
   */
  async clearCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    await this.cartItemRepository.delete({
      cartId: cart.id,
    });

    return this.getCart(userId);
  }
}