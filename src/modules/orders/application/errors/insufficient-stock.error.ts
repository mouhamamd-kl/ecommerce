export class InsufficientStockError extends Error {
  public readonly productId: number;
  public readonly requestedQuantity: number;
  public readonly availableQuantity: number;

  constructor(
    productId: number,
    requestedQuantity: number,
    availableQuantity: number,
    productName?: string,
  ) {
    const name = productName?.trim();
    const productLabel = name ? `"${name}"` : 'this product';

    super(
      availableQuantity <= 0
        ? `${name ? productLabel : 'This product'} is currently out of stock. Please remove it from your cart to continue.`
        : `Only ${availableQuantity} ${availableQuantity === 1 ? 'unit' : 'units'} of ${productLabel} ${availableQuantity === 1 ? 'is' : 'are'} available. Please reduce the quantity in your cart.`,
    );

    this.name = 'InsufficientStockError';

    this.productId = productId;
    this.requestedQuantity = requestedQuantity;
    this.availableQuantity = availableQuantity;

    Object.setPrototypeOf(this, InsufficientStockError.prototype);
  }
}
