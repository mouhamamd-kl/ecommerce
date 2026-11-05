import { Inject, Injectable } from '@nestjs/common';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../../../categories/application/ports/repositories/category-repository.port.js';

import {
  CATEGORY_VALIDATION,
  type CategoryValidationPort,
} from '../../application/ports/services/category-validation.port.js';

@Injectable()
export class CategoryValidationTypeOrmAdapter
  implements CategoryValidationPort
{
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepositoryPort,
  ) {}

  async findActiveByIds(categoryIds: number[]): Promise<number[]> {
    const activeCategories = await this.categoryRepository.findActive();

    const activeIds = new Set(
      activeCategories
        .map((category) => category.id)
        .filter((id): id is number => id !== null),
    );

    return categoryIds.filter((id) => activeIds.has(id));
  }
}
