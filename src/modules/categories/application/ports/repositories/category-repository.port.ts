import { Category } from '../../../domain/entities/category.js';

export interface CategoryRepositoryPort {
  findAll(): Promise<Category[]>;

  findActive(): Promise<Category[]>;

  findById(id: number): Promise<Category | null>;

  findActiveById(id: number): Promise<Category | null>;

  existsByName(name: string, excludeId?: number): Promise<boolean>;

  save(category: Category): Promise<Category>;

  remove(id: number): Promise<void>;
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');