import { Global, Module } from '@nestjs/common';
import { CatalogReadRouter } from './catalog-read-router.js';
import { RedisCache } from './redis-cache.js';
import { PublicCatalogCache } from './public-catalog-cache.js';
import { PerformanceController } from './performance.controller.js';

@Global()
@Module({
  providers: [CatalogReadRouter, RedisCache, PublicCatalogCache],
  exports: [CatalogReadRouter, PublicCatalogCache],
  controllers: [PerformanceController],
})
export class PerformanceModule {}
