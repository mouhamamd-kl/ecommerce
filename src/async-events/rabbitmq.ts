import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
  type Options,
} from 'amqplib';

export const MQ = {
  exchange: 'ecommerce.orders',
  queue: 'ecommerce.order-confirmation',
  retryExchange: 'ecommerce.email.retry',
  retryQueue: 'ecommerce.order-confirmation.retry',
  deadExchange: 'ecommerce.email.dead',
  deadQueue: 'ecommerce.order-confirmation.dlq',
  routingKey: 'order.created',
} as const;

export async function declareEmailTopology(
  channel: ConfirmChannel,
  retryDelayMs: number,
): Promise<void> {
  for (const name of [MQ.exchange, MQ.retryExchange, MQ.deadExchange])
    await channel.assertExchange(name, 'direct', { durable: true });
  await channel.assertQueue(MQ.deadQueue, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });
  await channel.bindQueue(MQ.deadQueue, MQ.deadExchange, 'email.failed');
  await channel.assertQueue(MQ.queue, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-dead-letter-exchange': MQ.deadExchange,
      'x-dead-letter-routing-key': 'email.failed',
      'x-dead-letter-strategy': 'at-least-once',
      'x-overflow': 'reject-publish',
      'x-delivery-limit': 20,
    },
  });
  await channel.bindQueue(MQ.queue, MQ.exchange, MQ.routingKey);
  await channel.assertQueue(MQ.retryQueue, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-message-ttl': retryDelayMs,
      'x-dead-letter-exchange': MQ.exchange,
      'x-dead-letter-routing-key': MQ.routingKey,
      'x-dead-letter-strategy': 'at-least-once',
      'x-overflow': 'reject-publish',
    },
  });
  await channel.bindQueue(MQ.retryQueue, MQ.retryExchange, 'email.retry');
}

export function publishConfirmed(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  body: Buffer,
  options: Options.Publish,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let returned = false;
    const onReturn = (message: ConsumeMessage) => {
      if (message.properties.messageId === options.messageId) returned = true;
    };
    const timer = setTimeout(
      () => finish(new Error('RabbitMQ publisher confirmation timed out.')),
      3000,
    );
    const finish = (error?: unknown) => {
      clearTimeout(timer);
      channel.off('return', onReturn);
      channel.off('close', onClose);
      if (error) reject(error);
      else if (returned) reject(new Error('RabbitMQ message was not routed.'));
      else resolve();
    };
    const onClose = () =>
      finish(new Error('RabbitMQ channel closed before confirmation.'));
    channel.on('return', onReturn);
    channel.once('close', onClose);
    try {
      channel.publish(
        exchange,
        routingKey,
        body,
        { ...options, persistent: true, mandatory: true },
        finish,
      );
    } catch (error) {
      finish(error);
    }
  });
}

export class EmailPublisher {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  constructor(
    private readonly url: string,
    private readonly retryDelayMs: number,
  ) {}

  private async connect(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    const connection = await amqp.connect(this.url, { timeout: 1500 });
    connection.on('error', () => undefined);
    connection.on('close', () => {
      if (this.connection === connection) {
        this.channel = undefined;
        this.connection = undefined;
      }
    });
    const channel = await connection.createConfirmChannel();
    channel.on('error', () => undefined);
    try {
      await declareEmailTopology(channel, this.retryDelayMs);
    } catch (error) {
      await connection.close().catch(() => undefined);
      throw error;
    }
    this.connection = connection;
    this.channel = channel;
    return channel;
  }
  async publish(id: string, payload: unknown): Promise<void> {
    try {
      const channel = await this.connect();
      await publishConfirmed(
        channel,
        MQ.exchange,
        MQ.routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          messageId: id,
          contentType: 'application/json',
          type: 'order.created',
          headers: { 'x-attempt': 1 },
        },
      );
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async close(): Promise<void> {
    const connection = this.connection;
    this.connection = undefined;
    this.channel = undefined;
    await connection?.close().catch(() => undefined);
  }
}
