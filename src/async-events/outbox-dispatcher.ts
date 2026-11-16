import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EmailPublisher } from './rabbitmq.js';
import { RealtimeService } from './realtime.service.js';
import type { RealtimeJob } from './order-event-outbox.js';

@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private readonly email: EmailPublisher;
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private stopping = false;
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {
    this.email = new EmailPublisher(
      config.get('RABBITMQ_URL', 'amqp://localhost:5672'),
      Number(config.get('EMAIL_RETRY_DELAY_MS', 5000)),
    );
  }
  onModuleInit(): void {
    if (this.config.get('ASYNC_EVENTS_ENABLED', 'false') !== 'true') return;
    this.timer = setInterval(() => {
      if (!this.running && !this.stopping) {
        this.running = this.dispatch()
          .catch(() => this.logger.warn('Outbox dispatch will retry.'))
          .finally(() => {
            this.running = undefined;
          });
      }
    }, 250);
  }
  async dispatch(): Promise<void> {
    await this.db.transaction(async (manager) => {
      const rows: Array<{
        id: string;
        kind: string;
        payload: unknown;
        attempts: number;
      }> = await manager.query(`
        SELECT id, kind, payload, attempts FROM order_outbox
        WHERE published_at IS NULL AND next_attempt_at <= now()
        ORDER BY created_at, id LIMIT 10 FOR UPDATE SKIP LOCKED`);
      for (const row of rows) {
        try {
          if (row.kind === 'email')
            await this.email.publish(row.id, row.payload);
          else await this.realtime.publish(row.payload as RealtimeJob);
          await manager.query(
            'UPDATE order_outbox SET published_at=now(), last_error=NULL WHERE id=$1',
            [row.id],
          );
        } catch {
          // Keep credentials and customer data out of logs; preserve the failed delivery.
          await manager.query(
            `UPDATE order_outbox SET attempts=attempts+1,
            next_attempt_at=now()+($2::int * interval '1 second'), last_error=$3 WHERE id=$1`,
            [
              row.id,
              Math.min(30, 2 ** Math.min(row.attempts, 5)),
              `${row.kind} destination unavailable`,
            ],
          );
          this.logger.warn(
            `Outbox ${row.kind} delivery deferred; it remains in PostgreSQL.`,
          );
        }
      }
    });
  }
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
    await this.email.close();
  }
}
