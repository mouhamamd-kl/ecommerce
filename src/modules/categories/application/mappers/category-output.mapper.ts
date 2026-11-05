import { Injectable } from '@nestjs/common';

import { Category } from '../../domain/entities/category.js';
import { CategoryOutput } from '../contracts/outputs/category.output.js';

@Injectable()
export class CategoryOutputMapper {
  toOutput(category: Category): CategoryOutput {
    if (category.id === null) {
      throw new Error('Cannot map an unsaved category');
    }

    return {
      id: category.id,
      name: category.name,
      isActive: category.isActive,
    };
  }

  toOutputs(categories: Category[]): CategoryOutput[] {
    return categories.map((category) => this.toOutput(category));
  }
}