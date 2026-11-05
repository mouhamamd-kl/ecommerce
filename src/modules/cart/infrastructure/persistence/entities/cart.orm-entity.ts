import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  type Relation,
} from 'typeorm';

import { User } from '../../../../users/entities/user.entity.js';
import { CartItemOrmEntity } from './cart-item.orm-entity.js';

@Entity('carts')
@Index('IDX_carts_user_id', ['userId'], { unique: true })
export class CartOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @OneToMany(
    () => CartItemOrmEntity,
    (item) => item.cart,
    { cascade: false },
  )
  items: Relation<CartItemOrmEntity[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}