import { Injectable, Inject } from '@nestjs/common';

import {
  CATEGORY_REPOSITORY,
  type CategoryRepositoryPort,
} from '../ports/repositories/category-repository.port.js';

import { CategoryOutput } from '../contracts/outputs/category.output.js';
import { CategoryOutputMapper } from '../mappers/category-output.mapper.js';

@Injectable()
export class GetAllCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repository: CategoryRepositoryPort,
    private readonly outputMapper: CategoryOutputMapper,
  ) {}

  async execute(): Promise<CategoryOutput[]> {
    const categories = await this.repository.findAll();

    return this.outputMapper.toOutputs(categories);
  }
}