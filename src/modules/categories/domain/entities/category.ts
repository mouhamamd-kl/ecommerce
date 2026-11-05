import { InvalidCategoryNameError } from '../errors/invalid-category-name.error.js';

export class Category {
  constructor(
    public readonly id: number | null,
    public readonly name: string,
    public readonly isActive: boolean,
  ) {
    this.validateName(name);
  }

  rename(name: string): Category {
    return new Category(this.id, name, this.isActive);
  }

  activate(): Category {
    return new Category(this.id, this.name, true);
  }

  deactivate(): Category {
    return new Category(this.id, this.name, false);
  }

  private validateName(name: string): void {
    const normalizedName = name.trim();

    if (
      normalizedName.length < 2 ||
      normalizedName.length > 100
    ) {
      throw new InvalidCategoryNameError();
    }
  }
}