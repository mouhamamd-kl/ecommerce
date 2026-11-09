import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { PublicCatalogCache } from '../src/performance/public-catalog-cache.js';
import { CatalogReadRouter } from '../src/performance/catalog-read-router.js';
import { RedisCache } from '../src/performance/redis-cache.js';
import { matchesEtag } from '../src/performance/catalog-http.js';
import { databaseOptions } from '../src/database/database-options.js';

function fixture() {
  let revision = '0';
  const entries = new Map<string, { value: string; expires: number; generation: string }>();
  const redis = {
    ready: true,
    get: vi.fn(async (key: string) => {
      const entry = entries.get(key);
      return entry && entry.expires > Date.now() ? entry.value : null;
    }),
    put: vi.fn(async (key: string, value: string, ttl: number, generation: string) => {
      entries.set(key, { value, expires: Date.now() + ttl * 1000, generation });
    }),
    invalidate: vi.fn(async (generation: string) => {
      for (const [key, entry] of entries) if (entry.generation === generation) entries.delete(key);
    }),
  };
  const reads = {
    snapshot: vi.fn(async () => ({ revision, fence: '0/123' })),
    load: vi.fn(async (_fence: string, loader: () => Promise<unknown>) => ({ data: await loader(), source: 'replica' })),
  };
  const cache = new PublicCatalogCache(redis as unknown as RedisCache, reads as unknown as CatalogReadRouter,
    new ConfigService({ DB_DATABASE: 'test', CATALOG_CACHE_TTL_SECONDS: 30 }));
  return { cache, redis, reads, setRevision: (value: string) => { revision = value; } };
}

describe('public catalog cache correctness', () => {
  afterEach(() => vi.useRealTimers());

  it('reuses a successful response and reloads it when the TTL expires', async () => {
    vi.useFakeTimers();
    const { cache } = fixture();
    const loader = vi.fn(async () => [{ id: 1, name: 'Original' }]);
    const first = await cache.read('products', 'Products', loader);
    const second = await cache.read('products', 'Products', loader);
    expect(second).toMatchObject({ cache: 'HIT', source: 'cache', etag: first.etag });
    expect(loader).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30001);
    await cache.read('products', 'Products', loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('rejects the previous generation even when Redis invalidation was unavailable', async () => {
    const { cache, redis, setRevision } = fixture();
    const first = await cache.read('product:1', 'Product', async () => ({ name: 'Old' }));
    redis.ready = false;
    setRevision('1');
    await cache.invalidate('0');
    redis.ready = true;
    const updated = await cache.read('product:1', 'Product', async () => ({ name: 'New' }));
    expect(updated.body).toContain('New');
    expect(updated.etag).not.toBe(first.etag);
  });

  it('does not populate the new generation with a slow response started before a write', async () => {
    const { cache, setRevision } = fixture();
    let finish!: (value: unknown) => void;
    const loading = cache.read('product:1', 'Product', () => new Promise(resolve => { finish = resolve; }));
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    setRevision('1');
    finish({ name: 'Old' });
    await loading;
    const result = await cache.read('product:1', 'Product', async () => ({ name: 'New' }));
    expect(result.body).toContain('New');
    expect(result.cache).toBe('MISS');
  });

  it('coalesces simultaneous cold reads into one loader call', async () => {
    const { cache } = fixture();
    const loader = vi.fn(async () => [{ id: 1 }]);
    await Promise.all(Array.from({ length: 10 }, () => cache.read('products', 'Products', loader)));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('bypasses an unavailable Redis server and never caches loader errors', async () => {
    const { cache, redis } = fixture();
    redis.ready = false;
    expect((await cache.read('products', 'Products', async () => [])).cache).toBe('BYPASS');
    expect(redis.put).not.toHaveBeenCalled();
    redis.ready = true;
    const failure = vi.fn(async () => { throw new Error('Not found'); });
    await expect(cache.read('product:99', 'Product', failure)).rejects.toThrow('Not found');
    await expect(cache.read('product:99', 'Product', failure)).rejects.toThrow('Not found');
    expect(failure).toHaveBeenCalledTimes(2);
  });
});

describe('HTTP conditional requests', () => {
  it.each([
    [undefined, false], ['W/"abc"', true], ['"abc"', true], ['"other", W/"abc"', true],
    ['*', true], ['"abcd"', false], ['W/"different"', false],
  ])('matches If-None-Match %s using weak comparison', (header, result) => {
    expect(matchesEtag(header, 'W/"abc"')).toBe(result);
  });
});

describe('read/write database routing', () => {
  it('keeps ordinary repository reads on the primary when replication is enabled', () => {
    const options = databaseOptions(new ConfigService({ DB_READ_REPLICA_ENABLED: 'true', DB_REPLICA_HOST: 'replica' }));
    expect(options).toMatchObject({ replication: { defaultMode: 'master', slaves: [{ host: 'replica' }] } });
  });

  it('uses the primary when the replica has not replayed the request WAL fence', async () => {
    const runner = { connect: vi.fn(), query: vi.fn(async () => [{ ready: false }]), release: vi.fn(async () => {}) };
    const db = { createQueryRunner: vi.fn(() => runner) };
    const reads = new CatalogReadRouter(db as never, new ConfigService({ DB_READ_REPLICA_ENABLED: 'true' }));
    const result = await reads.load('0/123', async () => 'fresh');
    expect(result).toEqual({ data: 'fresh', source: 'primary' });
    expect(reads.counts.fallback).toBe(1);
    expect(runner.release).toHaveBeenCalled();
  });

  it('uses the primary and releases the runner after a replica connection failure', async () => {
    const runner = { connect: vi.fn(async () => { throw new Error('offline'); }), release: vi.fn(async () => {}) };
    const reads = new CatalogReadRouter({ createQueryRunner: () => runner } as never, new ConfigService({ DB_READ_REPLICA_ENABLED: 'true' }));
    expect((await reads.load('0/123', async () => 'fresh')).source).toBe('primary');
    expect(runner.release).toHaveBeenCalled();
  });
});
