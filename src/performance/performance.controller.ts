import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AdminJwtGuard } from '../core/auth/admin/admin-jwt.guard.js';
import { PublicCatalogCache } from './public-catalog-cache.js';
import { CatalogReadRouter } from './catalog-read-router.js';
import { RedisCache } from './redis-cache.js';

@ApiTags('Admin / Performance')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard)
@Controller('admin/performance')
export class PerformanceController {
  constructor(private readonly cache: PublicCatalogCache, private readonly reads: CatalogReadRouter, private readonly redis: RedisCache, private readonly db: DataSource) {}

  @Get()
  async status() {
    const [primary] = await this.db.query('SELECT pg_is_in_recovery() AS is_replica, pg_current_wal_lsn()::text AS wal_lsn');
    return { status: 'success', message: 'Performance diagnostics', data: {
      redisReady: this.redis.ready, ttlSeconds: this.cache.ttl,
      catalogCache: this.cache.counts, catalogReads: this.reads.counts, primary,
    } };
  }
}
