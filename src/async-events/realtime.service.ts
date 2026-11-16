import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Pusher from 'pusher';
import type { RealtimeJob } from './order-event-outbox.js';

export interface RealtimeUser {
  id: number;
  role: string;
}

@Injectable()
export class RealtimeService {
  private readonly pusher: Pusher;
  constructor(
    private readonly config: ConfigService,
    private readonly db: DataSource,
  ) {
    this.pusher = new Pusher({
      appId: config.get('PUSHER_APP_ID', 'ecommerce'),
      key: config.get('PUSHER_APP_KEY', 'ecommerce-local'),
      secret: config.get('PUSHER_APP_SECRET', ''),
      host: config.get('PUSHER_HOST', 'localhost'),
      port: config.get('PUSHER_PORT', '6001'),
      useTLS: config.get('PUSHER_SCHEME', 'http') === 'https',
      timeout: 1500,
    });
  }
  clientConfig() {
    return {
      enabled: this.config.get('ASYNC_EVENTS_ENABLED', 'false') === 'true',
      key: this.config.get('PUSHER_APP_KEY', 'ecommerce-local'),
      host: this.config.get('PUSHER_PUBLIC_HOST', 'localhost'),
      port: Number(this.config.get('PUSHER_PUBLIC_PORT', 6001)),
      tls: this.config.get('PUSHER_PUBLIC_TLS', 'false') === 'true',
    };
  }
  async authorize(user: RealtimeUser, channel: string, socketId: string) {
    if (channel === 'private-admin.orders') {
      if (user.role !== 'admin')
        throw new ForbiddenException('This channel requires an administrator.');
    } else {
      const match = /^private-orders\.([1-9]\d*)$/.exec(channel);
      if (!match || user.role !== 'customer')
        throw new ForbiddenException('Order channel access denied.');
      const orderId = Number(match[1]);
      if (!Number.isSafeInteger(orderId))
        throw new ForbiddenException('Order channel access denied.');
      const [order]: Array<{ user_id: number }> = await this.db.query(
        'SELECT user_id FROM orders WHERE id=$1',
        [orderId],
      );
      if (!order || order.user_id !== user.id)
        throw new ForbiddenException('Order channel access denied.');
    }
    return this.pusher.authorizeChannel(socketId, channel);
  }
  async publish(job: RealtimeJob): Promise<void> {
    await this.pusher.trigger(job.channel, job.event, job.data);
  }
}
