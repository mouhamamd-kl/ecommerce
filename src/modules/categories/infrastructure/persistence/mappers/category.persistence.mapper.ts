import { Category } from '../../../domain/entities/category.js';
import { CategoryOrmEntity } from '../entities/category.orm-entity.js';

export class CategoryPersistenceMapper {
  static toDomain(orm: CategoryOrmEntity): Category {
    return new Category(
      orm.id,
      orm.name,
      orm.isActive,
    );
  }

  static toOrm(category: Category): CategoryOrmEntity {
    const orm = new CategoryOrmEntity();

    if (category.id !== null) {
      orm.id = category.id;
    }

    orm.name = category.name.trim();
    orm.isActive = category.isActive;

    return orm;
  }
}