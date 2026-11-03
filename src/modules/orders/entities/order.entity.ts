import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn, type Relation,
    Index,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import type { OrderItem } from './order-item.entity.js'; import {
    OrderStatus,
    PaymentStatus,
    type OrderStatusType,
    type PaymentStatusType,
} from '../order-status.js';

@Entity('orders')
@Index(['userId', 'createdAt'])
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => User, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(
        'OrderItem',
        (item: OrderItem) => item.order,
        { cascade: true },
    )
    items: Relation<OrderItem[]>;

    @Column({
        type: 'varchar',
        default: OrderStatus.pending,
    })
    status: OrderStatusType;

    @Column({
        name: 'payment_status',
        type: 'varchar',
        default: PaymentStatus.pending,
    })
    paymentStatus: PaymentStatusType;

    @Column({
        name: 'payment_method',
        type: 'varchar',
        default: 'cash_on_delivery',
    })
    paymentMethod: string;

    @Column('decimal', {
        precision: 12,
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number(value),
        },
    })
    total: number;

    @Column({ name: 'shipping_address', type: 'text' })
    shippingAddress: string;

    @Column({
        name: 'admin_note',
        type: 'text',
        nullable: true,
    })
    adminNote: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}