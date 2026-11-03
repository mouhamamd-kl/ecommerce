import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    OneToMany,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    type Relation,
    Index,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import type { CartItem } from './cart-item.entity.js';
@Entity('carts')
@Index('IDX_carts_user_id', ['userId'], { unique: true })
export class Cart {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(
        'CartItem',
        (item: CartItem) => item.cart,
        { cascade: false },
    )
    items: Relation<CartItem[]>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}