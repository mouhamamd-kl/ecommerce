import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
    OneToMany,
    type Relation,
} from 'typeorm';

import { Category } from '../../categories/entities/category.entity.js';
import { ProductPhoto } from './product-photo.entity.js';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 150 })
    name: string;

    @Column('decimal', {
        precision: 10,
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number(value),
        },
    })
    price: number;

    @Column({ default: true })
    isActive: boolean;

    @ManyToMany(() => Category, (category) => category.products, {
        cascade: false,
    })
    @JoinTable({
        name: 'product_categories',
        joinColumn: {
            name: 'product_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'category_id',
            referencedColumnName: 'id',
        },
    })
    categories: Category[];

    @OneToMany(
        'ProductPhoto',
        (photo: ProductPhoto) => photo.product,
    )
    photos: Relation<ProductPhoto[]>;
}