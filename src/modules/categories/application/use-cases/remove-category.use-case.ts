import { Injectable, Inject } from '@nestjs/common';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../ports/repositories/category-repository.port.js';

import { CategoryNotFoundError } from '../errors/category-not-found.error.js';

@Injectable()
export class RemoveCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepositoryPort,
  ) {}

  async execute(id: number): Promise<void> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    await this.repository.remove(id);
  }
}