import { Injectable, Inject } from '@nestjs/common';

import { Product } from '../../domain/entities/product.entity.js';
import { ProductPhoto } from '../../domain/entities/product-photo.entity.js';

import type { CreateProductInput } from '../contracts/inputs/create-product.input.js';
import type { ProductOutput } from '../contracts/outputs/product-output.js';

import { ProductOutputMapper } from '../mappers/product-output.mapper.js';

import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from '../ports/repositories/product-repository.port.js';

import {
  CATEGORY_VALIDATION,
  type CategoryValidationPort,
} from '../ports/services/category-validation.port.js';

import {
  normalizeCategoryIds,
  validateProductPhotos,
} from '../validators/product.validator.js';

import { InvalidProductCategoriesError } from '../errors/invalid-product-categories.error.js';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    @Inject(CATEGORY_VALIDATION)
    private readonly categoryValidation: CategoryValidationPort,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductOutput> {
    const categoryIds = normalizeCategoryIds(input.categoryIds);

    // Validate that all requested categories exist and are active.
    if (categoryIds.length > 0) {
      const validCategoryIds =
        await this.categoryValidation.findActiveByIds(categoryIds);

      if (validCategoryIds.length !== categoryIds.length) {
        throw new InvalidProductCategoriesError();
      }
    }

    // Validate product photos.
    validateProductPhotos(input.photos);

    // Convert photo inputs into domain entities.
    const photos = (input.photos ?? []).map(
      (photo) =>
        new ProductPhoto(
          null,
          photo.url,
          photo.isPrimary,
          photo.sortOrder,
        ),
    );

    // Create the domain entity.
    const product = new Product(
      null,
      input.name,
      input.price,
      true,
      categoryIds,
      photos,
    );

    // Persist through the repository port.
    const savedProduct = await this.productRepository.save(product);

    // Return the application output contract.
    return ProductOutputMapper.toOutput(savedProduct);
  }
}