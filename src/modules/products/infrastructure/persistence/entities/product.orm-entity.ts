import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  type Relation,
} from 'typeorm';

import { CategoryOrmEntity } from '../../../../categories/infrastructure/persistence/entities/category.orm-entity.js';
import { ProductPhotoOrmEntity } from './product-photo.orm-entity.js';

@Entity('products')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(
    () => CategoryOrmEntity,
    (category) => category.products,
    { cascade: false },
  )
  @JoinTable({
    name: 'product_categories',
    joinColumn: {
      name: 'product_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'category_id',
      referencedColumnName: 'id',
    },
  })
  categories: Relation<CategoryOrmEntity[]>;

  @OneToMany(
    () => ProductPhotoOrmEntity,
    (photo) => photo.product,
    { cascade: false },
  )
  photos: Relation<ProductPhotoOrmEntity[]>;
}