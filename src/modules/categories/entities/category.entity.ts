import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity.js';

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column()
    isActive: boolean;

    @ManyToMany(() => Product, (product) => product.categories)
    products: Product[];
}