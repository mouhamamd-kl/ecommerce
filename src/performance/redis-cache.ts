import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisCache implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCache.name);
  private readonly client;
  private lastErrorLog = 0;
  private blockedUntil = 0;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get('CATALOG_CACHE_ENABLED', 'true') === 'true';
    this.client = createClient({
      url: config.get('REDIS_URL', 'redis://localhost:6379'),
      disableOfflineQueue: true,
      socket: { connectTimeout: 500, reconnectStrategy: attempts => Math.min(100 + attempts * 100, 2000) },
    });
    this.client.on('error', () => {
      if (Date.now() - this.lastErrorLog > 10000) {
        this.logger.warn('Redis is unavailable; catalog reads will use PostgreSQL.');
        this.lastErrorLog = Date.now();
      }
    });
  }

  onModuleInit(): void {
    if (this.enabled) void this.client.connect().catch(() => undefined);
  }
  onModuleDestroy(): void { if (this.client.isOpen) this.client.destroy(); }
  get ready(): boolean { return this.enabled && this.client.isReady && Date.now() >= this.blockedUntil; }

  private async bounded<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Redis command deadline exceeded')), 250);
      })]);
    } catch (error) {
      this.blockedUntil = Date.now() + 1000;
      throw error;
    } finally { if (timer) clearTimeout(timer); }
  }

  async get(key: string): Promise<string | null> {
    if (!this.ready) return null;
    return this.bounded(this.client.get(key)).catch(() => null);
  }

  async put(key: string, value: string, ttl: number, generation: string): Promise<void> {
    if (!this.ready) return;
    // Track keys for eager deletion after writes; TTL also bounds orphaned keys.
    await this.bounded(this.client.multi()
      .set(key, value, { EX: ttl })
      .sAdd(generation, key)
      .expire(generation, ttl + 5)
      .exec()).catch(() => undefined);
  }

  async invalidate(generation: string): Promise<void> {
    if (!this.ready) return;
    try {
      const keys = await this.bounded(this.client.sMembers(generation));
      if (keys.length) await this.bounded(this.client.unlink(keys));
      await this.bounded(this.client.unlink(generation));
    } catch {
      // The transactional PostgreSQL revision still makes stale keys unreachable.
    }
  }
}
