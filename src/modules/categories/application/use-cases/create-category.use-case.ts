import { Injectable, Inject } from '@nestjs/common';

import { Category } from '../../domain/entities/category.js';
import { CreateCategoryInput } from '../contracts/inputs/create-category.input.js';
import { CategoryOutput } from '../contracts/outputs/category.output.js';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../ports/repositories/category-repository.port.js';

import { CategoryNameConflictError } from '../errors/category-name-conflict.error.js';
import { CategoryOutputMapper } from '../mappers/category-output.mapper.js';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepositoryPort,
    private readonly outputMapper: CategoryOutputMapper,
  ) {}

  async execute(input: CreateCategoryInput): Promise<CategoryOutput> {
    const name = input.name.trim();

    if (await this.repository.existsByName(name)) {
      throw new CategoryNameConflictError();
    }

    const category = new Category(null, name, input.isActive);
    const saved = await this.repository.save(category);

    return this.outputMapper.toOutput(saved);
  }
}