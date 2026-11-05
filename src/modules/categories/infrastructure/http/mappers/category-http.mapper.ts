import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';

import { CreateCategoryInput } from '../../../application/contracts/inputs/create-category.input.js';
import { UpdateCategoryInput } from '../../../application/contracts/inputs/update-category.input.js';

export class CategoryHttpMapper {
  static toCreateInput(
    dto: CreateCategoryDto,
  ): CreateCategoryInput {
    return {
      name: dto.name.trim(),
      isActive: dto.isActive ?? true,
    };
  }

  static toUpdateInput(
    id: number,
    dto: UpdateCategoryDto,
  ): UpdateCategoryInput {
    return {
      id,
      ...(dto.name !== undefined
        ? { name: dto.name.trim() }
        : {}),
      ...(dto.isActive !== undefined
        ? { isActive: dto.isActive }
        : {}),
    };
  }
}