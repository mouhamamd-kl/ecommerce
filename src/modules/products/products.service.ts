import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Product } from './entities/product.entity.js';
import { ProductPhoto } from './entities/product-photo.entity.js';
import { Category } from '../categories/entities/category.entity.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductPhotoDto } from './dto/product-photo.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductPhoto)
    private readonly photosRepository: Repository<ProductPhoto>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private async validateCategories(categoryIds: number[]) {
    const uniqueIds = [...new Set(categoryIds)];

    const categories = await this.categoriesRepository.find({
      where: {
        id: In(uniqueIds),
        isActive: true,
      },
    });

    if (categories.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more categories do not exist or are inactive',
      );
    }

    return categories;
  }

  private validatePhotos(photos: ProductPhotoDto[] = []) {
    const primaryCount = photos.filter(
      (photo) => photo.isPrimary === true,
    ).length;

    if (primaryCount > 1) {
      throw new BadRequestException(
        'A product can have only one primary photo',
      );
    }
  }

  private async savePhotos(
    product: Product,
    photos: ProductPhotoDto[],
  ) {
    if (photos.length === 0) {
      return [];
    }

    this.validatePhotos(photos);

    const hasPrimary = photos.some(
      (photo) => photo.isPrimary === true,
    );

    const photoEntities = photos.map((photo, index) =>
      this.photosRepository.create({
        productId: product.id,
        url: photo.url.trim(),
        isPrimary: photo.isPrimary ?? (!hasPrimary && index === 0),
        sortOrder: photo.sortOrder ?? index,
      }),
    );

    return this.photosRepository.save(photoEntities);
  }

  async findActive(): Promise<Product[]> {
    return this.productsRepository.find({
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
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
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
  }

  async findById(id: number): Promise<Product> {
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findActiveById(id: number): Promise<Product> {
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const categories = await this.validateCategories(dto.categoryIds);
    const photos = dto.photos ?? [];

    this.validatePhotos(photos);

    const product = this.productsRepository.create({
      name: dto.name.trim(),
      price: dto.price,
      isActive: dto.isActive ?? true,
      categories,
    });

    const savedProduct = await this.productsRepository.save(product);

    await this.savePhotos(savedProduct, photos);

    return this.findById(savedProduct.id);
  }

  async update(
    id: number,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findById(id);

    if (dto.categoryIds !== undefined) {
      product.categories = await this.validateCategories(
        dto.categoryIds,
      );
    }

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
    }

    if (dto.price !== undefined) {
      product.price = dto.price;
    }

    if (dto.isActive !== undefined) {
      product.isActive = dto.isActive;
    }

    if (dto.photos !== undefined) {
      this.validatePhotos(dto.photos);

      await this.photosRepository.delete({
        productId: product.id,
      });
    }

    await this.productsRepository.save(product);

    if (dto.photos !== undefined) {
      await this.savePhotos(product, dto.photos);
    }

    return this.findById(product.id);
  }

  async deactivate(id: number): Promise<Product> {
    const product = await this.findById(id);

    product.isActive = false;

    await this.productsRepository.save(product);

    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productsRepository.remove(product);
  }
}