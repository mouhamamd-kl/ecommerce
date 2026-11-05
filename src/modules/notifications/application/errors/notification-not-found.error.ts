export class NotificationNotFoundError extends Error {
  constructor(id: number) {
    super(`Notification with ID ${id} was not found`);
    this.name = 'NotificationNotFoundError';
  }
}
