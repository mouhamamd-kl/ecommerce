import { InvalidProductPhotosError } from '../errors/invalid-product-photos.error.js';

import type { ProductPhotoInput } from '../contracts/inputs/create-product.input.js';

export function normalizeCategoryIds(
  categoryIds?: number[],
): number[] {
  return [...new Set(categoryIds ?? [])];
}

export function validateProductPhotos(
  photos?: ProductPhotoInput[],
): void {
  if (!photos || photos.length === 0) {
    return;
  }

  const primaryPhotos = photos.filter(
    (photo) => photo.isPrimary,
  );

  if (primaryPhotos.length > 1) {
    throw new InvalidProductPhotosError(
      'A product can have only one primary photo',
    );
  }
}