import type { ProductOutput } from './product-output.js';
import type { ProductInventorySnapshot } from '../../ports/services/product-inventory.port.js';

export interface AdminProductOutput extends ProductOutput {
  inventory: ProductInventorySnapshot | null;
}
