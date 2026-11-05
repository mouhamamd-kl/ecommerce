export const OrderStatus = {
  pending: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const;

export type OrderStatusType =
  (typeof OrderStatus)[keyof typeof OrderStatus];