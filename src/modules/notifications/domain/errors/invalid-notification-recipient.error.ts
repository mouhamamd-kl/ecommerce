export class InvalidNotificationRecipientError extends Error {
  constructor() {
    super('A recipient ID is required for customer notifications');
    this.name = 'InvalidNotificationRecipientError';
  }
}
