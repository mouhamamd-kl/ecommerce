import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from './entities/category.entity.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { AdminCategoriesController } from './admin-categories.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController,
    AdminCategoriesController,],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule { }