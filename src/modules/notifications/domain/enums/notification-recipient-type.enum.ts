export const NotificationRecipientType = {
  customer: 'customer',
  admin: 'admin',
} as const;

export type NotificationRecipientTypeValue =
  (typeof NotificationRecipientType)[keyof typeof NotificationRecipientType];
