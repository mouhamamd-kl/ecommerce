// Explicit operator action after fixing SMTP. Never purge the DLQ.
import amqp from 'amqplib';
import { declareEmailTopology, MQ, publishConfirmed } from '../dist/async-events/rabbitmq.js';
process.loadEnvFile('.env');
const count = Number(process.argv[2] || 1);
if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Choose a replay count between 1 and 100.');
const connection = await amqp.connect(process.env.RABBITMQ_URL);
try {
  const channel = await connection.createConfirmChannel();
  await declareEmailTopology(channel, Number(process.env.EMAIL_RETRY_DELAY_MS || 5000));
  for (let i = 0; i < count; i++) {
    const message = await channel.get(MQ.deadQueue, { noAck: false });
    if (!message) break;
    try {
      await publishConfirmed(channel, MQ.exchange, MQ.routingKey, message.content, {
        messageId: message.properties.messageId, contentType: 'application/json', type: 'order.created', headers: { 'x-attempt': 1 },
      });
      channel.ack(message);
      console.log('Replayed one dead-lettered email with publisher confirmation.');
    } catch (error) { channel.nack(message, false, true); throw error; }
  }
} finally { await connection.close(); }
