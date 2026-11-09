import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CatalogReadRouter } from '../../../../../performance/catalog-read-router.js';
import { PublicCatalogCache } from '../../../../../performance/public-catalog-cache.js';

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
    private readonly reads: CatalogReadRouter,
    private readonly cache: PublicCatalogCache,
  ) {}

  async findAll(): Promise<Category[]> {
    const rows = await this.reads.repository(this.repository).find({
      order: { id: 'DESC' },
    });

    return rows.map(CategoryPersistenceMapper.toDomain);
  }

  async findActive(): Promise<Category[]> {
    const rows = await this.reads.repository(this.repository).find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return rows.map(CategoryPersistenceMapper.toDomain);
  }

  async findById(id: number): Promise<Category | null> {
    const row = await this.reads.repository(this.repository).findOne({
      where: { id },
    });

    return row ? CategoryPersistenceMapper.toDomain(row) : null;
  }

  async findActiveById(id: number): Promise<Category | null> {
    const row = await this.reads.repository(this.repository).findOne({
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
    const { saved, revision } = await this.repository.manager.transaction(async manager => ({
      saved: await manager.getRepository(CategoryOrmEntity).save(orm),
      revision: await this.cache.bumpRevision(manager),
    }));
    await this.cache.invalidate(revision);

    return CategoryPersistenceMapper.toDomain(saved);
  }

  async remove(id: number): Promise<void> {
    const revision = await this.repository.manager.transaction(async manager => {
      await manager.getRepository(CategoryOrmEntity).delete(id);
      return this.cache.bumpRevision(manager);
    });
    await this.cache.invalidate(revision);
  }
}
