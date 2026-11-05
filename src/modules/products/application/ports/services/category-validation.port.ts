export interface CategoryValidationPort {
  /**
   * Returns the subset of the given category IDs that exist and are active.
   */
  findActiveByIds(categoryIds: number[]): Promise<number[]>;
}

export const CATEGORY_VALIDATION = Symbol('CATEGORY_VALIDATION');
