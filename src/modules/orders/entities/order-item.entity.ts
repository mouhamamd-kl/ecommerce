import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';

import type { Order } from './order.entity.js';
import { Product } from '../../products/entities/product.entity.js';

@Entity('order_items')
@Index(['orderId'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(
    'Order',
    (order: Order) => order.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product> | null;

  @Column({
    name: 'product_name',
    length: 150,
  })
  productName: string;

  @Column('decimal', {
    name: 'unit_price',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  subtotal: number;
}