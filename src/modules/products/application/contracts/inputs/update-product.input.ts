import type { ProductPhotoInput } from './create-product.input.js';

export interface UpdateProductInput {
  name?: string;
  price?: number;
  isActive?: boolean;
  categoryIds?: number[];
  photos?: ProductPhotoInput[];
}