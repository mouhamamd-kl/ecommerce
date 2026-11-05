export class UnavailableProductsError extends Error {
  public readonly productIds: number[];

  constructor(productIds: number[]) {
    super(
      `The following products are unavailable: ${productIds.join(', ')}.`,
    );

    this.name = 'UnavailableProductsError';
    this.productIds = [...productIds];

    Object.setPrototypeOf(
      this,
      UnavailableProductsError.prototype,
    );
  }
}