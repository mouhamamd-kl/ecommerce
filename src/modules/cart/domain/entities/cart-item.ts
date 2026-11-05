import { InvalidCartItemQuantityError } from '../errors/invalid-cart-item-quantity.error.js';

export class CartItem {
  constructor(
    public readonly id: number | null,
    public readonly cartId: number,
    public readonly productId: number,
    private _quantity: number,
  ) {
    this.validateQuantity(_quantity);
  }

  get quantity(): number {
    return this._quantity;
  }

  changeQuantity(quantity: number): void {
    this.validateQuantity(quantity);
    this._quantity = quantity;
  }

  increaseQuantity(quantity: number): void {
    this.validateQuantity(quantity);
    this.changeQuantity(this._quantity + quantity);
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new InvalidCartItemQuantityError(quantity);
    }
  }
}