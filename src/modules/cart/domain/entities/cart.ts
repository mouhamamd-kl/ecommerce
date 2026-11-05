import { CartItem } from './cart-item.js';

export class Cart {
  constructor(
    public readonly id: number | null,
    public readonly userId: number,
    private _items: CartItem[] = [],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  get items(): ReadonlyArray<CartItem> {
    return this._items;
  }

  addItem(item: CartItem): void {
    const existingItem = this._items.find(
      (existing) => existing.productId === item.productId,
    );

    if (existingItem) {
      existingItem.increaseQuantity(item.quantity);
      return;
    }

    this._items.push(item);
  }

  removeItem(itemId: number): void {
    this._items = this._items.filter(
      (item) => item.id !== itemId,
    );
  }

  clear(): void {
    this._items = [];
  }

  get itemCount(): number {
    return this._items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }
}