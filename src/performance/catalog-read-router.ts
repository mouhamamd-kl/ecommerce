import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, type EntityManager, type ObjectLiteral, type Repository } from 'typeorm';

export interface CatalogSnapshot { revision: string; fence: string }

@Injectable()
export class CatalogReadRouter {
  private readonly context = new AsyncLocalStorage<EntityManager>();
  readonly counts = { primary: 0, replica: 0, fallback: 0 };

  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  repository<T extends ObjectLiteral>(primary: Repository<T>): Repository<T> {
    return this.context.getStore()?.getRepository(primary.target) ?? primary;
  }

  async snapshot(): Promise<CatalogSnapshot> {
    // Always use the primary: one small, indexed row establishes freshness.
    const [state]: CatalogSnapshot[] = await this.dataSource.query(
      'SELECT revision::text AS revision, pg_current_wal_lsn()::text AS fence FROM catalog_revision WHERE id=1',
    );
    if (!state) throw new Error('Catalog revision is missing. Run database initialization.');
    return state;
  }

  async load<T>(fence: string, loader: () => Promise<T>): Promise<{ data: T; source: 'primary' | 'replica' }> {
    if (this.config.get('DB_READ_REPLICA_ENABLED', 'false') === 'true') {
      const runner = this.dataSource.createQueryRunner('slave');
      try {
        await runner.connect();
        const [state]: Array<{ ready: boolean }> = await runner.query(
          'SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn AS ready', [fence],
        );
        if (state?.ready) {
          const data = await this.context.run(runner.manager, loader);
          this.counts.replica++;
          return { data, source: 'replica' };
        }
      } catch {
        // An unavailable replica must not break an otherwise healthy primary.
      } finally {
        await runner.release().catch(() => undefined);
      }
      this.counts.fallback++;
    }
    this.counts.primary++;
    return { data: await loader(), source: 'primary' };
  }
}
