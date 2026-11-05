import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { OrderOrmEntity } from './order.orm-entity.js';

import { ProductOrmEntity } from '../../../../products/infrastructure/persistence/entities/product.orm-entity.js';

@Entity('order_items')
export class OrderItemOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => OrderOrmEntity, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Relation<OrderOrmEntity>;

  @Column({
    name: 'product_id',
    type: 'int',
    nullable: true,
  })
  productId: number | null;

  @ManyToOne(() => ProductOrmEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductOrmEntity | null;

  @Column({
    name: 'product_name',
    type: 'varchar',
    length: 255,
  })
  productName: string;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  unitPrice: number;

  @Column({
    type: 'int',
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  subtotal: number;
}
