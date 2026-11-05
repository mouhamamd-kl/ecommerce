export interface CartItemOutput {
  id: number;
  productId: number;
  quantity: number;

  product: {
    id: number;
    name: string;
    price: number;
    isActive: boolean;
  } | null;

  subtotal: number;
}