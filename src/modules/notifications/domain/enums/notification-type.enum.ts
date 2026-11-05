export const NotificationType = {
  orderCreated: 'order_created',
  orderConfirmed: 'order_confirmed',
  orderProcessing: 'order_processing',
  orderShipped: 'order_shipped',
  orderDelivered: 'order_delivered',
  orderCancelled: 'order_cancelled',
  paymentReceived: 'payment_received',
  paymentFailed: 'payment_failed',
  lowStock: 'low_stock',
  system: 'system',
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];
