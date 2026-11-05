import { CartItemOutput } from './cart-item-output.js';

export interface CartOutput {
  id: number;
  userId: number;
  items: CartItemOutput[];
  itemCount: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}