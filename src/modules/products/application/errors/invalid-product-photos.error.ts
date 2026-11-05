export class InvalidProductPhotosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductPhotosError';
  }
}