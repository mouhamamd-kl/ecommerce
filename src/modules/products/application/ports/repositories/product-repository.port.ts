import { Product } from "../../../domain/entities/product.entity.js";

export interface ProductRepositoryPort {
  findActive(): Promise<Product[]>;

  findAll(): Promise<Product[]>;

  findById(id: number): Promise<Product | null>;

  findActiveById(id: number): Promise<Product | null>;

  save(product: Product): Promise<Product>;

  remove(id: number): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');