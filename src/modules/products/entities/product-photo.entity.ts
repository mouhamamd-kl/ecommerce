import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';

import type { Product } from './product.entity.js';

@Entity('product_photos')
@Index(['productId', 'sortOrder'])
export class ProductPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(
    'Product',
    (product: Product) => product.photos,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ length: 2048 })
  url: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}