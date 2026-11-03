import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { Inventory } from './inventory.entity.js';

export const InventoryMovementType = {
  stockAdded: 'stock_added',
  stockRemoved: 'stock_removed',
  reserved: 'reserved',
  released: 'released',
  sold: 'sold',
} as const;

export type InventoryMovementTypeValue =
  (typeof InventoryMovementType)[keyof typeof InventoryMovementType];

@Entity('inventory_movements')
@Index(['inventoryId', 'createdAt'])
export class InventoryMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'inventory_id' })
  inventoryId: number;

  @ManyToOne(() => Inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

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