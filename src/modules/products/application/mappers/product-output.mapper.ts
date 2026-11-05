import type { Product } from '../../domain/entities/product.entity.js';

import type { ProductOutput } from '../contracts/outputs/product-output.js';

export class ProductOutputMapper {
  static toOutput(product: Product): ProductOutput {
    if (product.id === null) {
      throw new Error('Cannot create ProductOutput without a persisted product ID');
    }

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      isActive: product.isActive,
      categoryIds: [...product.categoryIds],

      photos: product.photos.map((photo) => {
        if (photo.id === null) {
          throw new Error('Cannot create ProductPhotoOutput without a persisted photo ID');
        }

        return {
          id: photo.id,
          url: photo.url,
          isPrimary: photo.isPrimary,
          sortOrder: photo.sortOrder,
        };
      }),
    };
  }

  static toOutputs(products: Product[]): ProductOutput[] {
    return products.map((product) => this.toOutput(product));
  }
}