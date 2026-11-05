export class InvalidOrderDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderDataError';

    Object.setPrototypeOf(this, InvalidOrderDataError.prototype);
  }
}