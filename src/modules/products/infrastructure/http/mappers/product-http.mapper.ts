import type { CreateProductDto } from '../dtos/create-product.dto.js';
import type { UpdateProductDto } from '../dtos/update-product.dto.js';

import type { CreateProductInput } from '../../../application/contracts/inputs/create-product.input.js';
import type { UpdateProductInput } from '../../../application/contracts/inputs/update-product.input.js';

export class ProductHttpMapper {
  static toCreateInput(dto: CreateProductDto): CreateProductInput {
    return {
      name: dto.name,
      price: dto.price,
      categoryIds: dto.categoryIds,
      photos: dto.photos?.map((photo) => ({
        url: photo.url,
        isPrimary: photo.isPrimary ?? false,
        sortOrder: photo.sortOrder ?? 0,
      })),
    };
  }

  static toUpdateInput(dto: UpdateProductDto): UpdateProductInput {
    return {
      name: dto.name,
      price: dto.price,
      isActive: dto.isActive,
      categoryIds: dto.categoryIds,
      photos: dto.photos?.map((photo) => ({
        url: photo.url,
        isPrimary: photo.isPrimary ?? false,
        sortOrder: photo.sortOrder ?? 0,
      })),
    };
  }
}