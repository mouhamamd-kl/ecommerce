
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) { }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();

    const existing = await this.categoriesRepository.findOne({
      where: { name },
    });

    if (existing) {
      throw new ConflictException(
        'A category with this name already exists',
      );
    }

    const category = this.categoriesRepository.create({
      name,
      isActive: dto.isActive ?? true,
    });

    return this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findActive(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
  async findByIdActive(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
  async update(
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findById(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      const existing = await this.categoriesRepository.findOne({
        where: {
          name,
          id: Not(id),
        },
      });

      if (existing) {
        throw new ConflictException(
          'A category with this name already exists',
        );
      }

      category.name = name;
    }

    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }

    return this.categoriesRepository.save(category);
  }

  async deactivate(id: number): Promise<Category> {
    const category = await this.findById(id);

    category.isActive = false;

    return this.categoriesRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findById(id);

    await this.categoriesRepository.remove(category);
  }
}
