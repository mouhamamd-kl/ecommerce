import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { CreateAdminDto } from './dto/admin/create-admin.dto.js';
import { UpdateAdminDto } from './dto/admin/update-admin.dto.js';
import { Role } from './roles.js';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(dto: CreateAdminDto): Promise<User> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.usersRepository.findOne({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      role: Role.admin,
    });

    return this.usersRepository.save(user);
  }
  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id, role: Role.admin });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: email.trim().toLowerCase(),
      })
      .andWhere('user.role = :role', {
        role: Role.admin,
      })
      .getOne();
  }


  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<void> {
    const { password } = updateAdminDto;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    await this.usersRepository.update(id, { ...(password && { password: hashedPassword }), });
  }
}