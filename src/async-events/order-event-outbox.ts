import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import type { OrderOrmEntity } from '../modules/orders/infrastructure/persistence/entities/order.orm-entity.js';

export interface EmailJob {
  version: 1;
  eventId: string;
  orderId: number;
  customerEmail: string;
  total: number;
}
export interface RealtimeJob {
  channel: string;
  event: 'order.created' | 'order.updated';
  data: { eventId: string; orderId: number; status: string; updatedAt: string };
}

export async function enqueueOrderEvents(
  manager: EntityManager,
  order: OrderOrmEntity,
  created: boolean,
): Promise<void> {
  const eventId = randomUUID();
  const data = {
    eventId,
    orderId: order.id,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
  };
  const event = created ? 'order.created' : 'order.updated';
  const deliveries: Array<{
    id: string;
    kind: string;
    payload: EmailJob | RealtimeJob;
  }> = [
    {
      id: randomUUID(),
      kind: 'realtime',
      payload: { channel: 'private-admin.orders', event, data },
    },
    {
      id: randomUUID(),
      kind: 'realtime',
      payload: { channel: `private-orders.${order.id}`, event, data },
    },
  ];
  if (created) {
    const [customer]: Array<{ email: string }> = await manager.query(
      'SELECT email FROM "user" WHERE id=$1',
      [order.userId],
    );
    if (!customer) throw new Error('Order customer is missing.');
    deliveries.push({
      id: eventId,
      kind: 'email',
      payload: {
        version: 1,
        eventId,
        orderId: order.id,
        customerEmail: customer.email,
        total: Number(order.total),
      },
    });
  }
  await manager.query(
    `INSERT INTO order_outbox (id, kind, payload)
    SELECT id, kind, payload FROM jsonb_to_recordset($1::jsonb) AS delivery(id uuid, kind text, payload jsonb)`,
    [JSON.stringify(deliveries)],
  );
}
