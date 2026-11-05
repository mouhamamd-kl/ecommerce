import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';

import { ProductOrmEntity } from '../../../../products/infrastructure/persistence/entities/product.orm-entity.js';

@Entity('inventory')
export class InventoryOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', unique: true })
  productId: number;

  @OneToOne(() => ProductOrmEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Relation<ProductOrmEntity>;

  @Column({
    name: 'quantity_on_hand',
    type: 'int',
    default: 0,
  })
  quantityOnHand: number;

  @Column({
    name: 'quantity_reserved',
    type: 'int',
    default: 0,
  })
  quantityReserved: number;

  @Column({
    name: 'low_stock_threshold',
    type: 'int',
    default: 5,
  })
  lowStockThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get availableQuantity(): number {
    return this.quantityOnHand - this.quantityReserved;
  }
}
