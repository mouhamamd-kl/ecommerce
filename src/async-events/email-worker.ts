import amqp, { type ChannelModel, type ConsumeMessage } from 'amqplib';
import pg from 'pg';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { declareEmailTopology, MQ, publishConfirmed } from './rabbitmq.js';
import {
  deliverEmail,
  emailTransport,
  parseEmailJob,
} from './email-delivery.js';

export async function runEmailWorker(): Promise<void> {
  const { transport, mode, from } = emailTransport();
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'ecommerce',
    max: 2,
    connectionTimeoutMillis: 3000,
  });
  const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS || 4);
  const retryDelay = Number(process.env.EMAIL_RETRY_DELAY_MS || 5000);
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 20 ||
    !Number.isInteger(retryDelay) ||
    retryDelay < 1000
  ) {
    throw new Error('Invalid email retry configuration.');
  }
  let stopping = false;
  let shutdown: (() => Promise<void>) | undefined;
  const stop = () => {
    stopping = true;
    void shutdown?.();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  console.log(
    `Order email worker starting; transport=${mode}; maxAttempts=${maxAttempts}.`,
  );
  while (!stopping) {
    let currentConnection: ChannelModel | undefined;
    let currentHeartbeat: NodeJS.Timeout | undefined;
    try {
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        { timeout: 3000 },
      );
      currentConnection = connection;
      connection.on('error', () => undefined);
      const channel = await connection.createConfirmChannel();
      channel.on('error', () => undefined);
      await declareEmailTopology(channel, retryDelay);
      await channel.prefetch(1);
      const active = new Set<Promise<void>>();
      const closed = new Promise<void>((resolve) =>
        connection.once('close', resolve),
      );
      const handle = async (message: ConsumeMessage) => {
        let job;
        try {
          job = parseEmailJob(message.content);
        } catch {
          console.warn('Invalid confirmation message moved to DLQ.');
          channel.nack(message, false, false);
          return;
        }
        const attempt = Number(message.properties.headers?.['x-attempt'] || 1);
        try {
          const result = await deliverEmail(pool, transport, from, job);
          channel.ack(message); // Only after SMTP acceptance and the delivery record commit.
          console.log(
            `Order #${job.orderId}: ${result}; event=${job.eventId}.`,
          );
        } catch {
          if (!Number.isInteger(attempt) || attempt >= maxAttempts) {
            console.warn(
              `Order #${job.orderId}: email failed after ${attempt} attempts; moving to DLQ.`,
            );
            channel.nack(message, false, false);
            return;
          }
          try {
            await publishConfirmed(
              channel,
              MQ.retryExchange,
              'email.retry',
              message.content,
              {
                messageId: job.eventId,
                contentType: 'application/json',
                type: 'order.created',
                headers: { 'x-attempt': attempt + 1 },
              },
            );
            channel.ack(message); // A durable, confirmed retry copy now owns this delivery.
            console.warn(
              `Order #${job.orderId}: email attempt ${attempt} failed; retry scheduled.`,
            );
          } catch {
            await sleep(1000);
            channel.nack(message, false, true);
          }
        }
      };
      const consumer = await channel.consume(
        MQ.queue,
        (message) => {
          if (!message) {
            void connection.close().catch(() => undefined);
            return;
          }
          const operation = handle(message)
            .catch(() => {
              // A channel loss requeues its unacknowledged deliveries at the broker.
              void connection.close().catch(() => undefined);
            })
            .finally(() => active.delete(operation));
          active.add(operation);
        },
        { noAck: false },
      );
      const heartbeat = setInterval(
        () =>
          writeFileSync('/tmp/order-email-worker.health', String(Date.now())),
        5000,
      );
      currentHeartbeat = heartbeat;
      writeFileSync('/tmp/order-email-worker.health', String(Date.now()));
      shutdown = async () => {
        clearInterval(heartbeat);
        await channel.cancel(consumer.consumerTag).catch(() => undefined);
        await Promise.allSettled(active);
        await connection.close().catch(() => undefined);
      };
      console.log(`Consuming ${MQ.queue}; manual acknowledgements enabled.`);
      if (stopping) await shutdown();
      await closed;
      clearInterval(heartbeat);
      shutdown = undefined;
    } catch {
      if (!stopping)
        console.warn('Email worker connection unavailable; reconnecting.');
    } finally {
      if (currentHeartbeat) clearInterval(currentHeartbeat);
      await currentConnection?.close().catch(() => undefined);
      shutdown = undefined;
    }
    if (!stopping) await sleep(2000);
  }
  transport.close();
  await pool.end();
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Docker supplies environment variables. */
  }
  runEmailWorker().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Email worker failed.',
    );
    process.exitCode = 1;
  });
}
