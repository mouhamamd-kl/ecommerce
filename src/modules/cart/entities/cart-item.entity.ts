import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Check,
  type Relation,
} from 'typeorm';

import type { Cart } from './cart.entity.js';
import { Product } from '../../products/entities/product.entity.js';

@Entity('cart_items')
@Unique('UQ_cart_items_cart_product', ['cartId', 'productId'])
@Check('CHK_cart_items_quantity_positive', '"quantity" > 0')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cart_id', type: 'int' })
  cartId: number;

  @ManyToOne(
    'Cart',
    (cart: Cart) => cart.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cart_id' })
  cart: Relation<Cart>;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}