import { Injectable, Inject } from '@nestjs/common';

import { ProductPhoto } from '../../domain/entities/product-photo.entity.js';

import type { UpdateProductInput } from '../contracts/inputs/update-product.input.js';
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

import { ProductNotFoundError } from '../errors/product-not-found.error.js';
import { InvalidProductCategoriesError } from '../errors/invalid-product-categories.error.js';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,

    @Inject(CATEGORY_VALIDATION)
    private readonly categoryValidation: CategoryValidationPort,
  ) {}

  async execute(
    id: number,
    input: UpdateProductInput,
  ): Promise<ProductOutput> {
    let product = await this.productRepository.findById(id);

    if (!product) {
      throw new ProductNotFoundError(id);
    }

    // Update categories only when supplied.
    if (input.categoryIds !== undefined) {
      const categoryIds = normalizeCategoryIds(input.categoryIds);

      if (categoryIds.length > 0) {
        const validCategoryIds =
          await this.categoryValidation.findActiveByIds(categoryIds);

        if (validCategoryIds.length !== categoryIds.length) {
          throw new InvalidProductCategoriesError();
        }
      }

      product = product.changeCategoryIds(categoryIds);
    }

    // Update basic product information.
    if (input.name !== undefined) {
      product = product.changeName(input.name);
    }

    if (input.price !== undefined) {
      product = product.changePrice(input.price);
    }

    if (input.isActive !== undefined) {
      if(input.isActive) {
        product = product.activate();
      }else{
        product = product.deactivate();
      }
    }

    // Replace photos only when the photos property is supplied.
    if (input.photos !== undefined) {
      validateProductPhotos(input.photos);

      product = product.replacePhotos(input.photos.map(
        (photo) =>
          new ProductPhoto(
            null,
            photo.url,
            photo.isPrimary,
            photo.sortOrder,
          ),
      ));
    }

    const updatedProduct = await this.productRepository.save(product);

    return ProductOutputMapper.toOutput(updatedProduct);
  }
}