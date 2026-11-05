import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../../../domain/entities/product.entity.js';
import { ProductPhoto } from '../../../domain/entities/product-photo.entity.js';

import { PRODUCT_REPOSITORY } from '../../../application/ports/repositories/product-repository.port.js';
import type { ProductRepositoryPort } from '../../../application/ports/repositories/product-repository.port.js';

import { ProductOrmEntity } from '../entities/product.orm-entity.js';
import { ProductPhotoOrmEntity } from '../entities/product-photo.orm-entity.js';
import { CategoryOrmEntity } from '../../../../categories/infrastructure/persistence/entities/category.orm-entity.js';

import { ProductMapper } from '../mappers/product.mapper.js';

@Injectable()
export class ProductTypeOrmRepository implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly productsRepository: Repository<ProductOrmEntity>,

    @InjectRepository(ProductPhotoOrmEntity)
    private readonly photosRepository: Repository<ProductPhotoOrmEntity>,
  ) {}

  async findActive(): Promise<Product[]> {
    const products = await this.productsRepository.find({
      where: { isActive: true },
      relations: {
        categories: true,
        photos: true,
      },
      order: {
        id: 'DESC',
        photos: {
          sortOrder: 'ASC',
        },
      },
    });

    return products.map(ProductMapper.toDomain);
  }

  async findAll(): Promise<Product[]> {
    const products = await this.productsRepository.find({
      relations: {
        categories: true,
        photos: true,
      },
      order: {
        id: 'DESC',
        photos: {
          sortOrder: 'ASC',
        },
      },
    });

    return products.map(ProductMapper.toDomain);
  }

  async findById(id: number): Promise<Product | null> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        categories: true,
        photos: true,
      },
      order: {
        photos: {
          sortOrder: 'ASC',
        },
      },
    });

    return product ? ProductMapper.toDomain(product) : null;
  }

  async findActiveById(id: number): Promise<Product | null> {
    const product = await this.productsRepository.findOne({
      where: {
        id,
        isActive: true,
      },
      relations: {
        categories: true,
        photos: true,
      },
      order: {
        photos: {
          sortOrder: 'ASC',
        },
      },
    });

    return product ? ProductMapper.toDomain(product) : null;
  }

  async save(product: Product): Promise<Product> {
    const saved = await this.productsRepository.manager.transaction(
      async (manager) => {
        const productsRepo = manager.getRepository(ProductOrmEntity);
        const photosRepo = manager.getRepository(ProductPhotoOrmEntity);

        const ormProduct = ProductMapper.toOrm(product);

        // Attach existing category rows by their IDs.
        ormProduct.categories = product.categoryIds.map((id) => {
          const category = new CategoryOrmEntity();
          category.id = id;
          return category;
        });

        const savedProduct = await productsRepo.save(ormProduct);

        // Explicit photo persistence; no TypeORM cascade is required.
        await photosRepo.delete({
          productId: savedProduct.id,
        });

        if (product.photos.length > 0) {
          const photoEntities = product.photos.map((photo) => {
            const photoOrm = new ProductPhotoOrmEntity();

            photoOrm.productId = savedProduct.id;
            photoOrm.url = photo.url;
            photoOrm.isPrimary = photo.isPrimary;
            photoOrm.sortOrder = photo.sortOrder;

            return photoOrm;
          });

          await photosRepo.save(photoEntities);
        }

        return savedProduct;
      },
    );

    return (
      (await this.findById(saved.id)) ??
      new Product(
        saved.id,
        saved.name,
        Number(saved.price),
        saved.isActive,
        product.categoryIds,
        [...product.photos],
      )
    );
  }

  async remove(id: number): Promise<void> {
    await this.productsRepository.delete(id);
  }
}