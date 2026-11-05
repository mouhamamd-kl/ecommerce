
import { ProductPhoto } from './product-photo.entity.js';

export class Product {
  private _photos: ProductPhoto[];

  constructor(
    public readonly id: number | null,
    public readonly name: string,
    public readonly price: number,
    public readonly isActive: boolean,
    public readonly categoryIds: number[],
    photos: ProductPhoto[] = [],
  ) {
    if (!name.trim()) {
      throw new Error('Product name cannot be empty');
    }

    if (price < 0) {
      throw new Error('Product price cannot be negative');
    }

    this._photos = [...photos];
  }

  get photos(): ReadonlyArray<ProductPhoto> {
    return this._photos;
  }

  // Core product state transitions

  activate(): Product {
    return this.copy({ isActive: true });
  }

  deactivate(): Product {
    return this.copy({ isActive: false });
  }

  changeName(name: string): Product {
    return this.copy({ name });
  }

  changePrice(price: number): Product {
    return this.copy({ price });
  }

  changeCategoryIds(categoryIds: number[]): Product {
    return this.copy({ categoryIds });
  }

  replacePhotos(photos: ProductPhoto[]): Product {
    return this.copy({ photos });
  }

  private copy(
    changes: {
      name?: string;
      price?: number;
      isActive?: boolean;
      categoryIds?: number[];
      photos?: ProductPhoto[];
    },
  ): Product {
    return new Product(
      this.id,
      changes.name ?? this.name,
      changes.price ?? this.price,
      changes.isActive ?? this.isActive,
      changes.categoryIds ?? this.categoryIds,
      changes.photos ?? [...this._photos],
    );
  }

  // Existing photo operations

  addPhoto(photo: ProductPhoto): void {
    this._photos.push(photo);
  }

  removePhoto(photoId: number): void {
    this._photos = this._photos.filter(
      (photo) => photo.id !== photoId,
    );
  }

  setPrimaryPhoto(photoId: number): void {
    const photoExists = this._photos.some(
      (photo) => photo.id === photoId,
    );

    if (!photoExists) {
      throw new Error('Photo does not belong to this product');
    }

    this._photos = this._photos.map(
      (photo) =>
        new ProductPhoto(
          photo.id,
          photo.url,
          photo.id === photoId,
          photo.sortOrder,
        ),
    );
  }
}
