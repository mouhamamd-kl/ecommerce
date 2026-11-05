export interface ProductPhotoInput {
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface CreateProductInput {
  name: string;
  price: number;
  categoryIds?: number[];
  photos?: ProductPhotoInput[];
}