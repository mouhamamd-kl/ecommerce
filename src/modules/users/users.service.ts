import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/user/create-user.dto.js';
import { UpdateUserDto } from './dto/user/update-user.dto.js';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { Role } from './roles.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(dto: CreateUserDto): Promise<User> {
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
      role: Role.customer,
    });

    return this.usersRepository.save(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, role: Role.customer }, });
  }
  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id, role: Role.customer });
  }
  async update(id: number, updateUserDto: UpdateUserDto): Promise<void> {
    const { password } = updateUserDto;
    await this.usersRepository.update(id, { ...(password && { password: password }), });
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}