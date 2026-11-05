import { Inventory } from '../../../domain/entities/inventory.js';
import { InventoryMovement } from '../../../domain/entities/inventory-movement.js';
import type { AdjustStockInput } from '../../contracts/inputs/adjust-stock.input.js';

export interface InventoryProductSnapshot {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
}

/**
 * An inventory record together with the product summary it belongs to.
 */
export interface InventoryReadModel {
  inventory: Inventory;
  product: InventoryProductSnapshot | null;
}

export interface InventoryMovementReadModel {
  movement: InventoryMovement;
  inventory: Inventory | null;
}

/**
 * Operations on a locked inventory row inside a caller-managed transaction.
 * The repository provides these only within `transact`.
 */
export interface InventoryTransactionContext {
  findByProductIdForUpdate(productId: number): Promise<Inventory | null>;

  save(inventory: Inventory): Promise<Inventory>;

  recordMovement(movement: InventoryMovement): Promise<void>;
}

export interface InventoryRepositoryPort {
  findAll(): Promise<InventoryReadModel[]>;

  findByProductId(productId: number): Promise<InventoryReadModel | null>;

  /**
   * Products at or below their low-stock threshold.
   */
  findLowStock(): Promise<InventoryReadModel[]>;

  existsByProductId(productId: number): Promise<boolean>;

  findMovements(productId?: number): Promise<InventoryMovementReadModel[]>;

  /** Each backend creates the inventory and its initial movement atomically. */
  create(inventory: Inventory): Promise<Inventory>;

  /** Each backend adjusts stock and records the movement atomically. */
  adjustStock(input: AdjustStockInput): Promise<Inventory>;
}

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');
