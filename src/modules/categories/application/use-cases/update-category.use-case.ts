import { Injectable, Inject } from '@nestjs/common';

import { UpdateCategoryInput } from '../contracts/inputs/update-category.input.js';
import { CategoryOutput } from '../contracts/outputs/category.output.js';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../ports/repositories/category-repository.port.js';

import { CategoryNotFoundError } from '../errors/category-not-found.error.js';
import { CategoryNameConflictError } from '../errors/category-name-conflict.error.js';
import { CategoryOutputMapper } from '../mappers/category-output.mapper.js';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepositoryPort,
    private readonly outputMapper: CategoryOutputMapper,
  ) {}

  async execute(input: UpdateCategoryInput): Promise<CategoryOutput> {
    const category = await this.repository.findById(input.id);

    if (!category) {
      throw new CategoryNotFoundError(input.id);
    }

    if (input.name !== undefined) {
      const name = input.name.trim();

      if (
        await this.repository.existsByName(name, input.id)
      ) {
        throw new CategoryNameConflictError();
      }

      const renamed = category.rename(name);

      const updated = new (category.constructor as typeof import('../../domain/entities/category.js').Category)(
        renamed.id,
        renamed.name,
        input.isActive ?? renamed.isActive,
      );

      const saved = await this.repository.save(updated);

      return this.outputMapper.toOutput(saved);
    }

    const updated = input.isActive === true
      ? category.activate()
      : input.isActive === false
        ? category.deactivate()
        : category;

    const saved = await this.repository.save(updated);

    return this.outputMapper.toOutput(saved);
  }
}