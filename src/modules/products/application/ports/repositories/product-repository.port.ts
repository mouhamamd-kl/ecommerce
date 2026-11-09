import { Product } from "../../../domain/entities/product.entity.js";

export interface ProductSummary { id: number; name: string; price: number; isActive: boolean }

export interface ProductRepositoryPort {
  findActive(): Promise<Product[]>;

  findAll(): Promise<Product[]>;

  findById(id: number): Promise<Product | null>;

  findSummariesByIds(ids: number[]): Promise<ProductSummary[]>;

  findActiveById(id: number): Promise<Product | null>;

  save(product: Product): Promise<Product>;

  remove(id: number): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
