import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { Pool } from 'pg';
import type { EmailJob } from './order-event-outbox.js';

export function emailTransport(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.EMAIL_TRANSPORT || 'mailpit';
  if (!['mailpit', 'smtp'].includes(mode))
    throw new Error('EMAIL_TRANSPORT must be mailpit or smtp.');
  if (
    mode === 'smtp' &&
    (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)
  ) {
    throw new Error(
      'Configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD before enabling external SMTP.',
    );
  }
  const transport = nodemailer.createTransport({
    host: mode === 'mailpit' ? env.MAILPIT_HOST || 'localhost' : env.SMTP_HOST,
    port: mode === 'mailpit' ? 1025 : Number(env.SMTP_PORT || 587),
    secure: mode === 'smtp' && env.SMTP_SECURE === 'true',
    requireTLS: mode === 'smtp' && env.SMTP_REQUIRE_TLS !== 'false',
    ...(mode === 'smtp'
      ? { auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! } }
      : {}),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  });
  return {
    transport,
    mode,
    from:
      env.SMTP_FROM ||
      (mode === 'smtp'
        ? `BARAKAH <${env.SMTP_USER}>`
        : 'BARAKAH <no-reply@barakah.test>'),
  };
}

export function parseEmailJob(body: Buffer): EmailJob {
  const job = JSON.parse(body.toString('utf8')) as Partial<EmailJob>;
  if (
    job.version !== 1 ||
    typeof job.eventId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(job.eventId) ||
    !Number.isSafeInteger(job.orderId) ||
    job.orderId! < 1 ||
    typeof job.customerEmail !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.customerEmail) ||
    typeof job.total !== 'number' ||
    !Number.isFinite(job.total) ||
    job.total < 0
  ) {
    throw new Error('Invalid order confirmation message.');
  }
  return job as EmailJob;
}

export async function deliverEmail(
  pool: Pick<Pool, 'connect'>,
  transport: Transporter<SMTPTransport.SentMessageInfo>,
  from: string,
  job: EmailJob,
): Promise<'sent' | 'duplicate'> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize redeliveries of the same event, including across multiple worker instances.
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [job.eventId],
    );
    const existing = await client.query(
      'SELECT event_id FROM order_email_deliveries WHERE event_id=$1',
      [job.eventId],
    );
    if (existing.rowCount) {
      await client.query('COMMIT');
      return 'duplicate';
    }
    const result = await transport.sendMail({
      from,
      to: job.customerEmail,
      messageId: `<${job.eventId}.order-${job.orderId}@barakah.local>`,
      subject: `BARAKAH — order #${job.orderId} received`,
      text: `Thank you for your order!\n\nOrder: #${job.orderId}\nTotal: ${job.total.toFixed(2)} ${process.env.MAIL_CURRENCY || 'USD'}\nStatus: pending\n\nYou can follow your order at ${process.env.STOREFRONT_URL || 'http://localhost:5173'}/orders?order=${job.orderId}\n`,
    });
    if (!result.accepted?.length)
      throw new Error('SMTP did not accept the recipient.');
    await client.query(
      `INSERT INTO order_email_deliveries (event_id, order_id, recipient, provider_message_id)
      VALUES ($1,$2,$3,$4)`,
      [job.eventId, job.orderId, job.customerEmail, result.messageId],
    );
    await client.query('COMMIT');
    return 'sent';
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
