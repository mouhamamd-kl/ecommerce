import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminCategoriesController } from './infrastructure/http/controllers/admin-categories.controller.js';
import { CategoriesController } from './infrastructure/http/controllers/categories.controller.js';

import { CategoryOrmEntity } from './infrastructure/persistence/entities/category.orm-entity.js';
import { CategoryTypeOrmRepository } from './infrastructure/persistence/repositories/category.typeorm-repository.js';

import {
  CATEGORY_REPOSITORY,
} from './application/ports/repositories/category-repository.port.js';

import { CategoryOutputMapper } from './application/mappers/category-output.mapper.js';

import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case.js';
import { GetAllCategoriesUseCase } from './application/use-cases/get-all-categories.use-case.js';
import { GetActiveCategoriesUseCase } from './application/use-cases/get-active-categories.use-case.js';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case.js';
import { GetActiveCategoryUseCase } from './application/use-cases/get-active-category.use-case.js';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case.js';
import { DeactivateCategoryUseCase } from './application/use-cases/deactivate-category.use-case.js';
import { RemoveCategoryUseCase } from './application/use-cases/remove-category.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryOrmEntity])],

  controllers: [
    AdminCategoriesController,
    CategoriesController,
  ],

  providers: [
    CategoryTypeOrmRepository,

    {
      provide: CATEGORY_REPOSITORY,
      useExisting: CategoryTypeOrmRepository,
    },

    CategoryOutputMapper,

    CreateCategoryUseCase,
    GetAllCategoriesUseCase,
    GetActiveCategoriesUseCase,
    GetCategoryUseCase,
    GetActiveCategoryUseCase,
    UpdateCategoryUseCase,
    DeactivateCategoryUseCase,
    RemoveCategoryUseCase,
  ],

  exports: [
    CATEGORY_REPOSITORY,
  ],
})
export class CategoriesModule {}