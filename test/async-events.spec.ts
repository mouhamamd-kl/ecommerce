import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { EntityManager, DataSource } from 'typeorm';
import type { ConfirmChannel } from 'amqplib';
import type { Pool } from 'pg';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { RealtimeService } from '../src/async-events/realtime.service.js';
import {
  deliverEmail,
  emailTransport,
  parseEmailJob,
} from '../src/async-events/email-delivery.js';
import { enqueueOrderEvents } from '../src/async-events/order-event-outbox.js';
import { publishConfirmed } from '../src/async-events/rabbitmq.js';
import type { OrderOrmEntity } from '../src/modules/orders/infrastructure/persistence/entities/order.orm-entity.js';

describe('private order channels', () => {
  function service(owner = 7) {
    const query = vi.fn(async () => [{ user_id: owner }]);
    return {
      query,
      realtime: new RealtimeService(
        new ConfigService({ PUSHER_APP_SECRET: 'unit-test-secret' }),
        { query } as unknown as DataSource,
      ),
    };
  }
  it('signs the admin channel only for administrators', async () => {
    const { realtime, query } = service();
    expect(
      (
        await realtime.authorize(
          { id: 1, role: 'admin' },
          'private-admin.orders',
          '1.2',
        )
      ).auth,
    ).toMatch(/^ecommerce-local:/);
    await expect(
      realtime.authorize(
        { id: 7, role: 'customer' },
        'private-admin.orders',
        '1.2',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });
  it('signs an order channel only for the owning customer', async () => {
    const { realtime } = service();
    expect(
      (
        await realtime.authorize(
          { id: 7, role: 'customer' },
          'private-orders.12',
          '1.2',
        )
      ).auth,
    ).toBeTruthy();
    await expect(
      realtime.authorize(
        { id: 8, role: 'customer' },
        'private-orders.12',
        '1.2',
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      realtime.authorize({ id: 1, role: 'admin' }, 'private-orders.12', '1.2'),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects nonexistent, arbitrary, and unsafe order channel names', async () => {
    const { realtime, query } = service();
    query.mockResolvedValueOnce([]);
    await expect(
      realtime.authorize(
        { id: 7, role: 'customer' },
        'private-orders.99',
        '1.2',
      ),
    ).rejects.toMatchObject({ status: 403 });
    for (const channel of [
      'public-orders.1',
      'private-orders.1.extra',
      'private-orders.9007199254740993',
    ]) {
      await expect(
        realtime.authorize({ id: 7, role: 'customer' }, channel, '1.2'),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('transactional order event capture', () => {
  const order = {
    id: 3,
    userId: 7,
    status: 'pending',
    total: 12.5,
    updatedAt: new Date('2026-11-16T10:00:00Z'),
  } as OrderOrmEntity;
  it('records an email and two restricted broadcasts through the supplied transaction manager', async () => {
    const query = vi.fn(async () => [{ email: 'owner@example.test' }]);
    await enqueueOrderEvents(
      { query } as unknown as EntityManager,
      order,
      true,
    );
    const deliveries = JSON.parse(query.mock.calls[1]![1]![0] as string);
    expect(deliveries).toHaveLength(3);
    expect(
      deliveries.find((item: { kind: string }) => item.kind === 'email').payload
        .customerEmail,
    ).toBe('owner@example.test');
    const broadcasts = deliveries.filter(
      (item: { kind: string }) => item.kind === 'realtime',
    );
    expect(
      broadcasts.map(
        (item: { payload: { channel: string } }) => item.payload.channel,
      ),
    ).toEqual(['private-admin.orders', 'private-orders.3']);
    expect(JSON.stringify(broadcasts)).not.toContain('owner@example.test');
  });
  it('does not create another confirmation email for status changes', async () => {
    const query = vi.fn(async () => []);
    await enqueueOrderEvents(
      { query } as unknown as EntityManager,
      order,
      false,
    );
    const deliveries = JSON.parse(query.mock.calls[0]![1]![0] as string);
    expect(deliveries).toHaveLength(2);
    expect(
      deliveries.every((item: { kind: string }) => item.kind === 'realtime'),
    ).toBe(true);
  });
});

describe('SMTP delivery and broker redelivery', () => {
  const job = {
    version: 1 as const,
    eventId: randomUUID(),
    orderId: 3,
    customerEmail: 'owner@example.test',
    total: 12.5,
  };
  function dependencies(alreadySent = false) {
    const statements: string[] = [];
    const query = vi.fn(async (sql: string) => {
      statements.push(sql);
      return {
        rowCount: sql.startsWith('SELECT event_id') && alreadySent ? 1 : 0,
      };
    });
    const release = vi.fn();
    const pool = {
      connect: async () => ({ query, release }),
    } as unknown as Pool;
    const sendMail = vi.fn(async () => ({
      accepted: ['owner@example.test'],
      messageId: 'test-message',
    }));
    return {
      pool,
      transport: {
        sendMail,
      } as unknown as Transporter<SMTPTransport.SentMessageInfo>,
      sendMail,
      statements,
      release,
    };
  }
  it('records a successful SMTP acceptance before completing delivery', async () => {
    const { pool, transport, statements, sendMail, release } = dependencies();
    expect(await deliverEmail(pool, transport, 'shop@example.test', job)).toBe(
      'sent',
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(
      statements.some((sql) =>
        sql.startsWith('INSERT INTO order_email_deliveries'),
      ),
    ).toBe(true);
    expect(statements.at(-1)).toBe('COMMIT');
    expect(release).toHaveBeenCalled();
  });
  it('does not resend an event that already has a committed delivery record', async () => {
    const { pool, transport, sendMail } = dependencies(true);
    expect(await deliverEmail(pool, transport, 'shop@example.test', job)).toBe(
      'duplicate',
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
  it('rolls back the receipt when SMTP fails so the job can be retried', async () => {
    const { pool, transport, statements, sendMail } = dependencies();
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(
      deliverEmail(pool, transport, 'shop@example.test', job),
    ).rejects.toThrow('SMTP unavailable');
    expect(statements.at(-1)).toBe('ROLLBACK');
    expect(
      statements.some((sql) =>
        sql.startsWith('INSERT INTO order_email_deliveries'),
      ),
    ).toBe(false);
  });
  it('rejects invalid mail payloads before attempting SMTP', () => {
    expect(parseEmailJob(Buffer.from(JSON.stringify(job)))).toEqual(job);
    expect(() =>
      parseEmailJob(
        Buffer.from(
          JSON.stringify({ ...job, customerEmail: 'bad\r\nrecipient' }),
        ),
      ),
    ).toThrow();
    expect(() =>
      parseEmailJob(Buffer.from(JSON.stringify({ ...job, total: -1 }))),
    ).toThrow();
  });
  it('requires external credentials and TLS when selecting Gmail SMTP', () => {
    expect(() =>
      emailTransport({ EMAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.gmail.com' }),
    ).toThrow('Configure');
    const result = emailTransport({
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_USER: 'test@gmail.com',
      SMTP_PASSWORD: 'unit-test-only',
    });
    expect(result.transport.options).toMatchObject({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
    });
    result.transport.close();
  });
});

describe('publisher confirmations', () => {
  it('does not treat an unroutable confirmed message as delivered', async () => {
    const channel = new EventEmitter() as EventEmitter & {
      publish: (...args: unknown[]) => void;
    };
    channel.publish = (_exchange, _key, _body, options, callback) => {
      channel.emit('return', {
        properties: { messageId: (options as { messageId: string }).messageId },
      });
      (callback as (error: null) => void)(null);
    };
    await expect(
      publishConfirmed(
        channel as unknown as ConfirmChannel,
        'test',
        'missing',
        Buffer.from('{}'),
        { messageId: 'event' },
      ),
    ).rejects.toThrow('not routed');
  });
});
