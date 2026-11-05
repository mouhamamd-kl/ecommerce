import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../../../users/entities/user.entity.js';

import { OrderItemOrmEntity } from './order-item.orm-entity.js';

import { OrderStatus } from '../../../domain/enums/order-status.js';

import { PaymentStatus } from '../../../domain/enums/payment-status.js';

import { PaymentMethod } from '../../../domain/enums/payment-method.js';

@Entity('orders')
export class OrderOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'user_id',
    type: 'int',
  })
  userId: number;

  @ManyToOne(
    () => User,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(
    () => OrderItemOrmEntity,
    (item) => item.order,
    {
      cascade: ['insert', 'update'],
    },
  )
  items: OrderItemOrmEntity[];

  @Column({
    type: 'varchar',
    length: 30,
    default: OrderStatus.pending,
  })
  status: (typeof OrderStatus)[keyof typeof OrderStatus];

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 30,
    default: PaymentStatus.pending,
  })
  paymentStatus: (typeof PaymentStatus)[keyof typeof PaymentStatus];

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 30,
    default: PaymentMethod.cashOnDelivery,
  })
  paymentMethod: (typeof PaymentMethod)[keyof typeof PaymentMethod];

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  total: number;

  @Column({
    name: 'shipping_address',
    type: 'text',
  })
  shippingAddress: string;

  @Column({
    name: 'admin_note',
    type: 'text',
    nullable: true,
  })
  adminNote: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}