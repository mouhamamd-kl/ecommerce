import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 ,unique: true})
    email: string;

    @Column({ select: false })
    password: string;

    @Column()
    role: string; // 'admin' or 'customer'

}