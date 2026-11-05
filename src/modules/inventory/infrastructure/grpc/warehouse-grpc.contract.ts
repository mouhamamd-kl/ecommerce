import type { CallOptions, Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';

// Field names match proto-loader's camelCase mapping of warehouse/v1/warehouse.proto.
export interface WarehouseInventory {
  id: number;
  productId: number;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseMovement {
  id: number;
  inventoryId: number;
  productId: number;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceId: string;
  createdAt: string;
}

export interface ReservationItem {
  productId: number;
  quantity: number;
}

export interface WarehouseReservation {
  id: string;
  orderId: string;
  status: string;
  items: ReservationItem[];
  expiresAt: string;
  createdAt: string;
}

export interface ReserveStockRequest {
  orderId: string;
  idempotencyKey: string;
  items: ReservationItem[];
  expiresInSeconds: number;
}

export interface WarehouseRpc {
  createInventory: {
    request: {
      productId: number;
      quantityOnHand: number;
      lowStockThreshold: number;
    };
    response: WarehouseInventory;
  };
  getInventory: {
    request: { productId: number };
    response: WarehouseInventory;
  };
  getAllInventory: {
    request: { page: number; limit: number };
    response: {
      items: WarehouseInventory[];
      total: number;
      page: number;
      limit: number;
    };
  };
  getLowStock: WarehouseRpc['getAllInventory'];
  adjustStock: {
    request: {
      productId: number;
      quantity: number;
      operation: string;
      reason: string;
      referenceId: string;
      idempotencyKey: string;
    };
    response: WarehouseInventory;
  };
  getMovements: {
    request: { productId: number; page: number; limit: number };
    response: { items: WarehouseMovement[]; total: number };
  };
  reserveStock: {
    request: ReserveStockRequest;
    response: WarehouseReservation;
  };
  getReservation: {
    request: { reservationId: string };
    response: WarehouseReservation;
  };
  releaseReservation: {
    request: { reservationId: string; reason: string };
    response: WarehouseReservation;
  };
  confirmReservation: {
    request: { reservationId: string };
    response: WarehouseReservation;
  };
}

export type WarehouseService = {
  [K in keyof WarehouseRpc]: (
    request: WarehouseRpc[K]['request'],
    metadata: Metadata,
    options: CallOptions,
  ) => Observable<WarehouseRpc[K]['response']>;
};
