import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  type Relation,
} from 'typeorm';

import { ProductOrmEntity } from '../../../../products/infrastructure/persistence/entities/product.orm-entity.js';

@Entity('category')
export class CategoryOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  isActive: boolean;

  @ManyToMany(
    () => ProductOrmEntity,
    (product) => product.categories,
  )
  products: Relation<ProductOrmEntity[]>;
}
