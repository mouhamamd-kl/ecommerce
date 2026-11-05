import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { OrderOrmEntity } from './order.orm-entity.js';

@Entity('order_inventory_reservations')
export class OrderInventoryReservationOrmEntity {
  @PrimaryColumn({ name: 'order_id', type: 'int' })
  orderId: number;

  @ManyToOne(() => OrderOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<OrderOrmEntity>;

  @Column({
    name: 'reservation_id',
    type: 'varchar',
    length: 128,
    unique: true,
  })
  reservationId: string;
}
