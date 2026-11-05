import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';

import { ProductOrmEntity } from './product.orm-entity.js';

@Entity('product_photos')
@Index(['productId', 'sortOrder'])
export class ProductPhotoOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(
    () => ProductOrmEntity,
    (product) => product.photos,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'product_id' })
  product: Relation<ProductOrmEntity>;

  @Column({ length: 2048 })
  url: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}