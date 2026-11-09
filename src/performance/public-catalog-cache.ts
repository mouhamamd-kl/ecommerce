import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { CatalogReadRouter } from './catalog-read-router.js';
import { RedisCache } from './redis-cache.js';

interface StoredResponse { body: string; etag: string }
export interface CatalogResponse extends StoredResponse {
  cache: 'HIT' | 'MISS' | 'COALESCED' | 'BYPASS';
  source: 'cache' | 'primary' | 'replica';
}

@Injectable()
export class PublicCatalogCache {
  private readonly prefix: string;
  readonly ttl: number;
  readonly counts = { hits: 0, misses: 0, bypasses: 0, coalesced: 0 };
  private readonly pending = new Map<string, Promise<CatalogResponse>>();

  constructor(private readonly redis: RedisCache, private readonly reads: CatalogReadRouter, config: ConfigService) {
    this.prefix = `catalog:${encodeURIComponent(config.get('DB_DATABASE', 'ecommerce'))}:v1`;
    this.ttl = Number(config.get('CATALOG_CACHE_TTL_SECONDS', 30));
    if (!Number.isInteger(this.ttl) || this.ttl < 1 || this.ttl > 3600) throw new Error('Catalog TTL must be between 1 and 3600 seconds.');
  }

  async bumpRevision(manager: EntityManager): Promise<string> {
    const [state]: Array<{ previous: string }> = await manager.query(
      'UPDATE catalog_revision SET revision=revision+1 WHERE id=1 RETURNING (revision-1)::text AS previous',
    );
    if (!state) throw new Error('Catalog revision is missing. Run database initialization.');
    return state.previous;
  }

  async invalidate(revision: string): Promise<void> {
    await this.redis.invalidate(`${this.prefix}:${revision}:keys`);
  }

  async read(key: string, message: string, loader: () => Promise<unknown>): Promise<CatalogResponse> {
    const state = await this.reads.snapshot();
    const cacheKey = `${this.prefix}:${state.revision}:${key}`;
    if (this.redis.ready) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const value = JSON.parse(cached) as StoredResponse;
          if (typeof value.body === 'string' && typeof value.etag === 'string') {
            this.counts.hits++;
            return { ...value, cache: 'HIT', source: 'cache' };
          }
        } catch { /* A malformed cache entry is a miss, never an API error. */ }
      }
    }
    const existing = this.pending.get(cacheKey);
    if (existing) {
      this.counts.coalesced++;
      return { ...await existing, cache: 'COALESCED' };
    }
    const operation = this.fill(cacheKey, state.revision, state.fence, message, loader);
    this.pending.set(cacheKey, operation);
    try { return await operation; } finally { this.pending.delete(cacheKey); }
  }

  private async fill(key: string, revision: string, fence: string, message: string, loader: () => Promise<unknown>): Promise<CatalogResponse> {
    const { data, source } = await this.reads.load(fence, loader);
    const body = JSON.stringify({ status: 'success', message, data });
    const value = { body, etag: `W/"${createHash('sha256').update(body).digest('base64url')}"` };
    const ready = this.redis.ready;
    if (ready) {
      this.counts.misses++;
      await this.redis.put(key, JSON.stringify(value), this.ttl, `${this.prefix}:${revision}:keys`);
    } else this.counts.bypasses++;
    return { ...value, cache: ready ? 'MISS' : 'BYPASS', source };
  }
}
