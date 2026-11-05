import type { ProductPhotoOutput } from './product-photo-output.js';

export interface ProductOutput {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
  categoryIds: number[];
  photos: ProductPhotoOutput[];
}