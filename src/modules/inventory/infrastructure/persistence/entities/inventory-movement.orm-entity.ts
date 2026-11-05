import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { InventoryOrmEntity } from './inventory.orm-entity.js';

import type {
  InventoryMovementTypeValue,
} from '../../../domain/enums/inventory-movement-type.enum.js';

@Entity('inventory_movements')
@Index(['inventoryId', 'createdAt'])
export class InventoryMovementOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'inventory_id' })
  inventoryId: number;

  @ManyToOne(() => InventoryOrmEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_id' })
  inventory: InventoryOrmEntity;

  @Column({
    type: 'varchar',
    length: 30,
  })
  type: InventoryMovementTypeValue;

  // Positive quantity; type determines what happened.
  @Column({ type: 'int' })
  quantity: number;

  @Column({
    name: 'quantity_before',
    type: 'int',
  })
  quantityBefore: number;

  @Column({
    name: 'quantity_after',
    type: 'int',
  })
  quantityAfter: number;

  @Column({
    type: 'varchar',
    length: 500,
  })
  reason: string;

  @Column({
    name: 'reference_order_id',
    type: 'int',
    nullable: true,
  })
  referenceOrderId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
