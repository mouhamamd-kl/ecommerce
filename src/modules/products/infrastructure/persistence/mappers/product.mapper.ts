import { Product } from '../../../domain/entities/product.entity.js';
import { ProductPhoto } from '../../../domain/entities/product-photo.entity.js';

import { ProductOrmEntity } from '../entities/product.orm-entity.js';
import { ProductPhotoOrmEntity } from '../entities/product-photo.orm-entity.js';
import { CategoryOrmEntity } from '../../../../categories/infrastructure/persistence/entities/category.orm-entity.js';

export class ProductMapper {
  static toDomain(orm: ProductOrmEntity): Product {
    const photos = (orm.photos ?? []).map(
      (photo: ProductPhotoOrmEntity) =>
        new ProductPhoto(
          photo.id,
          photo.url,
          photo.isPrimary,
          photo.sortOrder,
        ),
    );

    return new Product(
      orm.id,
      orm.name,
      orm.price,
      orm.isActive,
      (orm.categories ?? []).map((category) => category.id),
      photos,
    );
  }

  static toOrm(domain: Product): ProductOrmEntity {
    const orm = new ProductOrmEntity();

    if (domain.id !== null) {
      orm.id = domain.id;
    }

    orm.name = domain.name;
    orm.price = domain.price;
    orm.isActive = domain.isActive;

    orm.categories = domain.categoryIds.map((id) => {
      const category = new CategoryOrmEntity();
      category.id = id;
      return category;
    });

    orm.photos = domain.photos.map((photo) => {
      const photoOrm = new ProductPhotoOrmEntity();

      if (photo.id !== null) {
        photoOrm.id = photo.id;
      }

      photoOrm.url = photo.url;
      photoOrm.isPrimary = photo.isPrimary;
      photoOrm.sortOrder = photo.sortOrder;

      return photoOrm;
    });

    return orm;
  }
}