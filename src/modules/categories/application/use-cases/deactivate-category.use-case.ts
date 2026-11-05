import { Injectable, Inject } from '@nestjs/common';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../ports/repositories/category-repository.port.js';

import { CategoryNotFoundError } from '../errors/category-not-found.error.js';
import { CategoryOutput } from '../contracts/outputs/category.output.js';
import { CategoryOutputMapper } from '../mappers/category-output.mapper.js';

@Injectable()
export class DeactivateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepositoryPort,
    private readonly outputMapper: CategoryOutputMapper,
  ) {}

  async execute(id: number): Promise<CategoryOutput> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    const saved = await this.repository.save(category.deactivate());

    return this.outputMapper.toOutput(saved);
  }
}