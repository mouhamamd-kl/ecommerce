import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { Category } from '../../../domain/entities/category.js';
import { CategoryRepositoryPort } from '../../../application/ports/repositories/category-repository.port.js';

import { CategoryOrmEntity } from '../entities/category.orm-entity.js';
import { CategoryPersistenceMapper } from '../mappers/category.persistence.mapper.js';

@Injectable()
export class CategoryTypeOrmRepository
  implements CategoryRepositoryPort
{
  constructor(
    @InjectRepository(CategoryOrmEntity)
    private readonly repository: Repository<CategoryOrmEntity>,
  ) {}

  async findAll(): Promise<Category[]> {
    const rows = await this.repository.find({
      order: { id: 'DESC' },
    });

    return rows.map(CategoryPersistenceMapper.toDomain);
  }

  async findActive(): Promise<Category[]> {
    const rows = await this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return rows.map(CategoryPersistenceMapper.toDomain);
  }

  async findById(id: number): Promise<Category | null> {
    const row = await this.repository.findOne({
      where: { id },
    });

    return row ? CategoryPersistenceMapper.toDomain(row) : null;
  }

  async findActiveById(id: number): Promise<Category | null> {
    const row = await this.repository.findOne({
      where: { id, isActive: true },
    });

    return row ? CategoryPersistenceMapper.toDomain(row) : null;
  }

  async existsByName(
    name: string,
    excludeId?: number,
  ): Promise<boolean> {
    const where = excludeId === undefined
      ? { name }
      : { name, id: Not(excludeId) };

    return this.repository.exists({ where });
  }

  async save(category: Category): Promise<Category> {
    const orm = CategoryPersistenceMapper.toOrm(category);
    const saved = await this.repository.save(orm);

    return CategoryPersistenceMapper.toDomain(saved);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}