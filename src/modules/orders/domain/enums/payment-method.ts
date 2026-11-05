export const PaymentMethod = {
  cashOnDelivery: 'cash_on_delivery',
  online: 'online',
} as const;

export type PaymentMethodType =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];