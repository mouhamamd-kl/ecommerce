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

import { CartOrmEntity } from './cart.orm-entity.js';
import { ProductOrmEntity } from '../../../../products/infrastructure/persistence/entities/product.orm-entity.js';

@Entity('cart_items')
@Unique('UQ_cart_items_cart_product', ['cartId', 'productId'])
@Check('CHK_cart_items_quantity_positive', '"quantity" > 0')
export class CartItemOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cart_id', type: 'int' })
  cartId: number;

  @ManyToOne(
    () => CartOrmEntity,
    (cart) => cart.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cart_id' })
  cart: Relation<CartOrmEntity>;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(
    () => ProductOrmEntity,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'product_id' })
  product: Relation<ProductOrmEntity>;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}