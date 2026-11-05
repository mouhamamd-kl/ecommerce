import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { ConflictException, Logger } from '@nestjs/common';
import {
  loadPackageDefinition,
  Server,
  ServerCredentials,
  status,
  type ServiceDefinition,
  type UntypedServiceImplementation,
  type handleUnaryCall,
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import type { DataSource, EntityManager } from 'typeorm';
import { InventoryBackendConfig } from '../src/modules/inventory/infrastructure/grpc/inventory-backend.config.js';
import {
  WarehouseGrpcClient,
  WAREHOUSE_PROTO_PATH,
} from '../src/modules/inventory/infrastructure/grpc/warehouse-grpc.client.js';
import { InventoryGrpcRepository } from '../src/modules/inventory/infrastructure/grpc/inventory.grpc-repository.js';
import { Inventory } from '../src/modules/inventory/domain/entities/inventory.js';
import { InventoryAlreadyExistsError } from '../src/modules/inventory/domain/errors/inventory-already-exists.error.js';
import { InventoryNotFoundError } from '../src/modules/inventory/domain/errors/inventory-not-found.error.js';
import type { ProductRepositoryPort } from '../src/modules/products/application/ports/repositories/product-repository.port.js';
import { InventoryGrpcAdapter } from '../src/modules/orders/infrastructure/adapters/inventory.grpc-adapter.js';
import { InventoryTypeOrmAdapter } from '../src/modules/orders/infrastructure/adapters/inventory.typeorm-adapter.js';
import { TypeOrmOrderTransactionContext } from '../src/modules/orders/infrastructure/persistence/typeorm-order-transaction-context.js';
import { TypeOrmOrderUnitOfWork } from '../src/modules/orders/infrastructure/persistence/typeorm-order-unit-of-work.js';
import { CreateOrderUseCase } from '../src/modules/orders/application/use-cases/create-order.use-case.js';
import { CancelCustomerOrderUseCase } from '../src/modules/orders/application/use-cases/cancel-customer-order.use-case.js';
import { UpdateOrderStatusUseCase } from '../src/modules/orders/application/use-cases/update-order-status.use-case.js';
import { Order } from '../src/modules/orders/domain/entities/order.entity.js';
import { OrderItem } from '../src/modules/orders/domain/entities/order-item.entity.js';
import {
  OrderStatus,
  type OrderStatusType,
} from '../src/modules/orders/domain/enums/order-status.js';
import { PaymentMethod } from '../src/modules/orders/domain/enums/payment-method.js';
import { PaymentStatus } from '../src/modules/orders/domain/enums/payment-status.js';
import type { OrderRepositoryPort } from '../src/modules/orders/application/ports/repositories/order-repository.port.js';
import { Product } from '../src/modules/products/domain/entities/product.entity.js';
import { GetProductUseCase } from '../src/modules/products/application/use-cases/get-product.use-case.js';
import { ProductInventoryGrpcAdapter } from '../src/modules/products/infrastructure/adapters/product-inventory.grpc-adapter.js';

function orderFixture(
  status: OrderStatusType = OrderStatus.pending,
  deletedProduct = false,
): Order {
  return new Order({
    id: 42,
    userId: 1,
    items: [
      new OrderItem({
        id: 1,
        productId: deletedProduct ? null : 1,
        productName: 'Product 1',
        unitPrice: 10,
        quantity: 2,
      }),
    ],
    status,
    paymentStatus: PaymentStatus.pending,
    paymentMethod: PaymentMethod.cashOnDelivery,
    total: 20,
    shippingAddress: 'Test address',
    adminNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const wireInventory = (productId: number) => ({
  id: String(productId + 100),
  product_id: String(productId),
  quantity_on_hand: '20',
  quantity_reserved: '3',
  available_quantity: '17',
  low_stock_threshold: '5',
  is_low_stock: false,
  created_at: '2026-11-04T08:00:00Z',
  updated_at: '2026-11-04T09:00:00Z',
});

// Use snake_case and string int64s on the server, as an independent wire-contract check.
function unary<Request, Response>(
  fn: (request: Request) => Response | Promise<Response>,
): handleUnaryCall<Request, Response> {
  return (call, callback) => {
    Promise.resolve()
      .then(() => fn(call.request))
      .then(
        (result) => callback(null, result),
        (error: Error) => callback(error),
      );
  };
}

describe('warehouse gRPC integration', () => {
  let server: Server;
  let client: WarehouseGrpcClient;
  let handlers: UntypedServiceImplementation;
  let repository: InventoryGrpcRepository;
  let records: Map<number, { orderId: number; reservationId: string }>;
  let manager: EntityManager;
  let reservations: Map<
    string,
    { id: string; order_id: string; status: string }
  >;
  let reserveRequests: unknown[];
  let releaseRequests: unknown[];
  let confirmRequests: unknown[];
  let config: InventoryBackendConfig;

  beforeEach(async () => {
    records = new Map();
    reservations = new Map();
    reserveRequests = [];
    releaseRequests = [];
    confirmRequests = [];
    const reservationRepository = {
      create: (record: { orderId: number; reservationId: string }) => record,
      save: async (record: { orderId: number; reservationId: string }) => {
        records.set(record.orderId, record);
        return record;
      },
      findOneBy: async ({ orderId }: { orderId: number }) =>
        records.get(orderId) ?? null,
    };
    manager = {
      getRepository: () => reservationRepository,
    } as unknown as EntityManager;
    handlers = {
      getInventory: unary(({ product_id }: { product_id: string }) =>
        wireInventory(Number(product_id)),
      ),
      reserveStock: unary(
        (request: { order_id: string; idempotency_key: string }) => {
          reserveRequests.push(request);
          let reservation = reservations.get(request.idempotency_key);
          if (!reservation) {
            reservation = {
              id: `reservation-${request.order_id}`,
              order_id: request.order_id,
              status: 'active',
            };
            reservations.set(request.idempotency_key, reservation);
          }
          return reservation;
        },
      ),
      releaseReservation: unary((request: { reservation_id: string }) => {
        releaseRequests.push(request);
        const reservation = [...reservations.values()].find(
          (item) => item.id === request.reservation_id,
        )!;
        reservation.status = 'released';
        return reservation;
      }),
      confirmReservation: unary((request: { reservation_id: string }) => {
        confirmRequests.push(request);
        const reservation = [...reservations.values()].find(
          (item) => item.id === request.reservation_id,
        )!;
        reservation.status = 'confirmed';
        return reservation;
      }),
    };
    const definition = loadPackageDefinition(
      loadSync(WAREHOUSE_PROTO_PATH, {
        keepCase: true,
        longs: String,
        defaults: true,
      }),
    );
    const warehouse = definition.warehouse as unknown as {
      v1: { WarehouseService: { service: ServiceDefinition } };
    };
    server = new Server();
    // Dispatch dynamically so each scenario can change the remote behavior.
    const dispatch = Object.fromEntries(
      Object.keys(warehouse.v1.WarehouseService.service).map((method) => [
        method,
        (
          call: Parameters<handleUnaryCall<unknown, unknown>>[0],
          callback: Parameters<handleUnaryCall<unknown, unknown>>[1],
        ) => {
          const handler = handlers[
            method[0].toLowerCase() + method.slice(1)
          ] as handleUnaryCall<unknown, unknown>;
          if (!handler) {
            callback({ code: status.UNIMPLEMENTED, message: method });
            return;
          }
          handler(call, callback);
        },
      ]),
    );
    server.addService(warehouse.v1.WarehouseService.service, dispatch);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync(
        '127.0.0.1:0',
        ServerCredentials.createInsecure(),
        (error, port) => (error ? reject(error) : resolve(port)),
      );
    });
    config = new InventoryBackendConfig(
      new ConfigService({
        INVENTORY_DRIVER: 'grpc',
        WAREHOUSE_GRPC_URL: `127.0.0.1:${port}`,
        WAREHOUSE_GRPC_TIMEOUT_MS: 1000,
      }),
    );
    client = new WarehouseGrpcClient(config);
    const products = {
      findById: async (id: number) => ({
        id,
        name: `Product ${id}`,
        price: 10,
        isActive: true,
      }),
    } as unknown as ProductRepositoryPort;
    repository = new InventoryGrpcRepository(client, products);
  });

  afterEach(() => {
    client.onModuleDestroy();
    server.forceShutdown();
    vi.restoreAllMocks();
  });

  it('maps protobuf field names, int64s, dates and local product summaries', async () => {
    const result = await repository.findByProductId(7);
    expect(result?.inventory).toMatchObject({
      id: 107,
      productId: 7,
      quantityOnHand: 20,
      quantityReserved: 3,
    });
    expect(result?.inventory.createdAt).toEqual(
      new Date('2026-11-04T08:00:00Z'),
    );
    expect(result?.product).toMatchObject({ id: 7, name: 'Product 7' });
  });

  it('includes warehouse stock in the admin product details', async () => {
    const products = {
      findById: async () => new Product(7, 'Product 7', 10, false, []),
    } as unknown as ProductRepositoryPort;
    const result = await new GetProductUseCase(
      products,
      new ProductInventoryGrpcAdapter(client),
    ).execute(7);
    expect(result).toMatchObject({
      id: 7,
      isActive: false,
      inventory: {
        quantityOnHand: 20,
        quantityReserved: 3,
        availableQuantity: 17,
        lowStockThreshold: 5,
        isLowStock: false,
      },
    });
  });

  it('distinguishes missing warehouse inventory from warehouse failures in admin details', async () => {
    const products = {
      findById: async () => new Product(7, 'Product 7', 10, true, []),
    } as unknown as ProductRepositoryPort;
    const getProduct = new GetProductUseCase(
      products,
      new ProductInventoryGrpcAdapter(client),
    );
    handlers.getInventory = unary(() => {
      throw { code: status.NOT_FOUND, message: 'missing' };
    });
    expect((await getProduct.execute(7)).inventory).toBeNull();
    handlers.getInventory = unary(() => {
      throw { code: status.UNAVAILABLE, message: 'unavailable' };
    });
    await expect(getProduct.execute(7)).rejects.toMatchObject({
      status: 503,
      message: 'Warehouse service is unavailable.',
    });
  });

  it('creates and adjusts stock using warehouse atomic RPCs', async () => {
    let createRequest: unknown;
    let adjustRequest: unknown;
    handlers.createInventory = unary((request: unknown) => {
      createRequest = request;
      return wireInventory(7);
    });
    handlers.adjustStock = unary((request: unknown) => {
      adjustRequest = request;
      return wireInventory(7);
    });
    await repository.create(
      new Inventory({
        id: null,
        productId: 7,
        quantityOnHand: 20,
        quantityReserved: 0,
        lowStockThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await repository.adjustStock({
      productId: 7,
      quantity: 2,
      operation: 'add',
      reason: ' Restock ',
    });
    expect(createRequest).toEqual({
      product_id: '7',
      quantity_on_hand: '20',
      low_stock_threshold: '5',
    });
    expect(adjustRequest).toMatchObject({
      product_id: '7',
      quantity: '2',
      operation: 'add',
      reason: 'Restock',
      idempotency_key: expect.stringMatching(/^ecommerce:adjust:/),
    });
  });

  it('fetches every inventory and low-stock page instead of truncating at the warehouse page limit', async () => {
    const pages: number[] = [];
    const list = unary(({ page }: { page: number }) => {
      pages.push(page);
      return { items: [wireInventory(page)], total: '2', page, limit: 100 };
    });
    handlers.getAllInventory = list;
    handlers.getLowStock = list;
    expect(
      (await repository.findAll()).map((item) => item.inventory.productId),
    ).toEqual([1, 2]);
    expect((await repository.findLowStock()).length).toBe(2);
    expect(pages).toEqual([1, 2, 1, 2]);
  });

  it('paginates movements and preserves opaque reservation references', async () => {
    handlers.getAllInventory = unary(() => ({
      items: [wireInventory(1), wireInventory(2)],
      total: '2',
    }));
    handlers.getMovements = unary(
      ({ product_id, page }: { product_id: string; page: number }) => ({
        items: [
          {
            id: String(Number(product_id) * 10 + page),
            inventory_id: String(Number(product_id) + 100),
            product_id,
            type: 'reserved',
            quantity: '2',
            quantity_before: '0',
            quantity_after: '2',
            reason: 'Order reservation',
            reference_id: 'opaque-reservation-id',
            created_at: '2026-11-04T10:00:00Z',
          },
        ],
        total: '2',
      }),
    );
    const result = await repository.findMovements();
    expect(result).toHaveLength(4);
    expect(result[0].movement).toMatchObject({
      referenceId: 'opaque-reservation-id',
      referenceOrderId: null,
    });
  });

  it('maps missing and duplicate inventory to the existing domain errors', async () => {
    handlers.getInventory = unary(() => {
      throw { code: status.NOT_FOUND, message: 'missing' };
    });
    handlers.createInventory = unary(() => {
      throw { code: status.ALREADY_EXISTS, message: 'duplicate' };
    });
    handlers.adjustStock = unary(() => {
      throw { code: status.NOT_FOUND, message: 'missing' };
    });
    expect(await repository.findByProductId(999)).toBeNull();
    await expect(
      repository.adjustStock({
        productId: 999,
        quantity: 1,
        operation: 'add',
        reason: 'Restock',
      }),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    await expect(
      repository.create(
        new Inventory({
          id: null,
          productId: 1,
          quantityOnHand: 1,
          quantityReserved: 0,
          lowStockThreshold: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    ).rejects.toBeInstanceOf(InventoryAlreadyExistsError);
  });

  it('reserves all items in one RPC and uses the persisted ID after adapter recreation', async () => {
    const items = [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 3 },
    ];
    await new InventoryGrpcAdapter(client).reserve(
      new TypeOrmOrderTransactionContext(manager),
      items,
      42,
    );
    expect(reserveRequests).toEqual([
      {
        order_id: '42',
        idempotency_key: 'ecommerce:order:42:reserve',
        items: [
          { product_id: '1', quantity: '2' },
          { product_id: '2', quantity: '3' },
        ],
        expires_in_seconds: '0',
      },
    ]);
    expect(records.get(42)?.reservationId).toBe('reservation-42');
    await new InventoryGrpcAdapter(client).releaseReservation(
      new TypeOrmOrderTransactionContext(manager),
      [],
      42,
    );
    expect(releaseRequests).toEqual([
      { reservation_id: 'reservation-42', reason: 'Order #42 cancelled' },
    ]);

    await new InventoryGrpcAdapter(client).reserve(
      new TypeOrmOrderTransactionContext(manager),
      items,
      43,
    );
    await new InventoryGrpcAdapter(client).fulfillReservation(
      new TypeOrmOrderTransactionContext(manager),
      [],
      43,
    );
    expect(confirmRequests).toEqual([{ reservation_id: 'reservation-43' }]);
  });

  it('compensates a reservation if the database commit fails', async () => {
    const commitError = new Error('database commit failed');
    const dataSource = {
      transaction: async (
        work: (manager: EntityManager) => Promise<unknown>,
      ) => {
        await work(manager);
        throw commitError;
      },
    } as unknown as DataSource;
    const unitOfWork = new TypeOrmOrderUnitOfWork(dataSource);
    await expect(
      unitOfWork.execute((transaction) =>
        new InventoryGrpcAdapter(client).reserve(
          transaction,
          [{ productId: 1, quantity: 2 }],
          42,
        ),
      ),
    ).rejects.toBe(commitError);
    expect(releaseRequests).toHaveLength(1);
    expect([...reservations.values()][0].status).toBe('released');
  });

  it('aggregates duplicate cart products into a single warehouse reservation during checkout', async () => {
    const adapter = new InventoryGrpcAdapter(client);
    const dataSource = {
      transaction: async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager),
    } as unknown as DataSource;
    const clearCart = vi.fn(async () => {});
    const notify = vi.fn(async () => {});
    const orders = {
      save: async () => orderFixture(),
    } as unknown as OrderRepositoryPort;
    const checkout = new CreateOrderUseCase(
      orders,
      {
        getItemsForCheckout: async () => [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 1 },
        ],
        clearCart,
      },
      {
        findActiveByIds: async () => [{ id: 1, name: 'Product 1', price: 10 }],
      },
      adapter,
      new TypeOrmOrderUnitOfWork(dataSource),
      { notifyOrderCreated: notify, notifyOrderStatusChanged: async () => {} },
    );
    const result = await checkout.execute(1, {
      shippingAddress: 'Test address',
      paymentMethod: PaymentMethod.cashOnDelivery,
    });
    expect(result.id).toBe(42);
    expect(reserveRequests).toHaveLength(1);
    expect(reserveRequests[0]).toMatchObject({
      items: [{ product_id: '1', quantity: '2' }],
    });
    expect(clearCart).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
  });

  it.each([
    {
      available: null,
      message:
        '"Classic T-Shirt" is currently out of stock. Please remove it from your cart to continue.',
    },
    {
      available: 0,
      message:
        '"Classic T-Shirt" is currently out of stock. Please remove it from your cart to continue.',
    },
    {
      available: 1,
      message:
        'Only 1 unit of "Classic T-Shirt" is available. Please reduce the quantity in your cart.',
    },
  ])(
    'explains checkout stock shortages without changing the cart (available: $available)',
    async ({ available, message }) => {
      handlers.getInventory = unary(() => {
        if (available === null) {
          throw { code: status.NOT_FOUND, message: 'missing inventory' };
        }
        return {
          ...wireInventory(3),
          quantity_on_hand: String(available + 3),
          quantity_reserved: '3',
          available_quantity: String(available),
        };
      });
      const save = vi.fn(async () => orderFixture());
      const clearCart = vi.fn(async () => {});
      const notify = vi.fn(async () => {});
      const dataSource = {
        transaction: async (
          work: (manager: EntityManager) => Promise<unknown>,
        ) => work(manager),
      } as unknown as DataSource;
      const checkout = new CreateOrderUseCase(
        { save } as unknown as OrderRepositoryPort,
        {
          getItemsForCheckout: async () => [{ productId: 3, quantity: 2 }],
          clearCart,
        },
        {
          findActiveByIds: async () => [
            { id: 3, name: 'Classic T-Shirt', price: 10 },
          ],
        },
        new InventoryGrpcAdapter(client),
        new TypeOrmOrderUnitOfWork(dataSource),
        {
          notifyOrderCreated: notify,
          notifyOrderStatusChanged: async () => {},
        },
      );
      await expect(
        checkout.execute(1, {
          shippingAddress: 'Test address',
          paymentMethod: PaymentMethod.cashOnDelivery,
        }),
      ).rejects.toMatchObject({
        name: 'InsufficientStockError',
        productId: 3,
        requestedQuantity: 2,
        availableQuantity: available ?? 0,
        message,
      });
      expect(save).not.toHaveBeenCalled();
      expect(clearCart).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
      expect(reserveRequests).toHaveLength(0);
    },
  );

  it('releases stock and sends no notification when cart clearing fails after reserving', async () => {
    const failure = new Error('cart clearing failed');
    const notify = vi.fn(async () => {});
    const dataSource = {
      transaction: async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager),
    } as unknown as DataSource;
    const checkout = new CreateOrderUseCase(
      { save: async () => orderFixture() } as unknown as OrderRepositoryPort,
      {
        getItemsForCheckout: async () => [{ productId: 1, quantity: 2 }],
        clearCart: async () => {
          throw failure;
        },
      },
      {
        findActiveByIds: async () => [{ id: 1, name: 'Product 1', price: 10 }],
      },
      new InventoryGrpcAdapter(client),
      new TypeOrmOrderUnitOfWork(dataSource),
      { notifyOrderCreated: notify, notifyOrderStatusChanged: async () => {} },
    );
    await expect(
      checkout.execute(1, {
        shippingAddress: 'Test address',
        paymentMethod: PaymentMethod.cashOnDelivery,
      }),
    ).rejects.toBe(failure);
    expect([...reservations.values()][0].status).toBe('released');
    expect(notify).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'deliver'] as const)(
    'completes %s using the reservation even after all products were deleted',
    async (action) => {
      const adapter = new InventoryGrpcAdapter(client);
      await adapter.reserve(
        new TypeOrmOrderTransactionContext(manager),
        [{ productId: 1, quantity: 2 }],
        42,
      );
      const currentOrder = orderFixture(
        action === 'cancel' ? OrderStatus.pending : OrderStatus.shipped,
        true,
      );
      const orders = {
        findByIdForCustomerUpdate: async () => currentOrder,
        findByIdForUpdate: async () => currentOrder,
        save: async () => currentOrder,
      } as unknown as OrderRepositoryPort;
      const unitOfWork = new TypeOrmOrderUnitOfWork({
        transaction: async (
          work: (manager: EntityManager) => Promise<unknown>,
        ) => work(manager),
      } as unknown as DataSource);
      const notification = {
        notifyOrderCreated: async () => {},
        notifyOrderStatusChanged: async () => {},
      };
      const result =
        action === 'cancel'
          ? await new CancelCustomerOrderUseCase(
              orders,
              adapter,
              unitOfWork,
              notification,
            ).execute({ orderId: 42, customerId: 1 })
          : await new UpdateOrderStatusUseCase(
              orders,
              adapter,
              unitOfWork,
              notification,
            ).execute({ orderId: 42, status: OrderStatus.delivered });
      expect(result.status).toBe(
        action === 'cancel' ? OrderStatus.cancelled : OrderStatus.delivered,
      );
      expect(
        action === 'cancel' ? releaseRequests : confirmRequests,
      ).toHaveLength(1);
      if (action === 'deliver')
        expect(result.paymentStatus).toBe(PaymentStatus.paid);
    },
  );

  it('recovers an ambiguous reserve response using the same idempotency key before rollback cleanup', async () => {
    const original = handlers.reserveStock as handleUnaryCall<unknown, unknown>;
    let calls = 0;
    const loseFirstResponse: handleUnaryCall<unknown, unknown> = (
      call,
      callback,
    ) => {
      calls++;
      original(call, (error, value) => {
        if (calls === 1)
          callback({
            code: status.UNAVAILABLE,
            message: 'response lost after commit',
          });
        else callback(error, value);
      });
    };
    handlers.reserveStock = loseFirstResponse;
    const context = new TypeOrmOrderTransactionContext(manager);
    await expect(
      new InventoryGrpcAdapter(client).reserve(
        context,
        [{ productId: 1, quantity: 2 }],
        42,
      ),
    ).rejects.toMatchObject({ status: 503 });
    await context.compensate();
    expect(reservations.size).toBe(1);
    expect(reserveRequests).toHaveLength(2);
    expect([...reservations.values()][0].status).toBe('released');
  });

  it('does not attempt to reserve again after a definitive stock failure', async () => {
    handlers.reserveStock = unary(() => {
      throw { code: status.FAILED_PRECONDITION, message: 'insufficient stock' };
    });
    const context = new TypeOrmOrderTransactionContext(manager);
    await expect(
      new InventoryGrpcAdapter(client).reserve(
        context,
        [{ productId: 1, quantity: 2 }],
        42,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await context.compensate();
    expect(reservations.size).toBe(0);
    expect(releaseRequests).toHaveLength(0);
  });

  it('rejects changing inventory backends for an order without a warehouse mapping', async () => {
    await expect(
      new InventoryGrpcAdapter(client).releaseReservation(
        new TypeOrmOrderTransactionContext(manager),
        [],
        42,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(releaseRequests).toHaveLength(0);
  });

  it('never cleans up a reservation that belongs to a different order', async () => {
    handlers.reserveStock = unary(() => ({
      id: 'other-reservation',
      order_id: '99',
      status: 'active',
    }));
    const context = new TypeOrmOrderTransactionContext(manager);
    await expect(
      new InventoryGrpcAdapter(client).reserve(
        context,
        [{ productId: 1, quantity: 2 }],
        42,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await context.compensate();
    expect(releaseRequests).toHaveLength(0);
    expect(records.size).toBe(0);
  });

  it('rejects carts exceeding the warehouse batch limit before reserving anything', async () => {
    const items = Array.from({ length: 101 }, (_, index) => ({
      productId: index + 1,
      quantity: 1,
    }));
    await expect(
      new InventoryGrpcAdapter(client).reserve(
        new TypeOrmOrderTransactionContext(manager),
        items,
        42,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(reserveRequests).toHaveLength(0);
  });

  it('enforces actual RPC deadlines and reports transport failures', async () => {
    // Establish the channel first so the test measures the RPC deadline.
    await repository.findByProductId(1);
    const deadlineClient = new WarehouseGrpcClient(
      new InventoryBackendConfig(
        new ConfigService({
          INVENTORY_DRIVER: 'grpc',
          WAREHOUSE_GRPC_URL: config.url,
          WAREHOUSE_GRPC_TIMEOUT_MS: 100,
        }),
      ),
    );
    handlers.getInventory = () => {};
    try {
      const deadlineRepository = new InventoryGrpcRepository(
        deadlineClient,
        {} as ProductRepositoryPort,
      );
      await expect(deadlineRepository.findByProductId(1)).rejects.toMatchObject(
        { status: 504 },
      );
    } finally {
      deadlineClient.onModuleDestroy();
    }
    handlers.getInventory = unary(() => {
      throw { code: status.UNAVAILABLE, message: 'unavailable' };
    });
    await expect(repository.findByProductId(1)).rejects.toMatchObject({
      status: 503,
    });
  });

  it('rejects int64 values that cannot be represented safely in JavaScript', async () => {
    handlers.getInventory = unary(() => ({
      ...wireInventory(1),
      quantity_on_hand: '9007199254740993',
    }));
    await expect(repository.findByProductId(1)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('preserves the original database error when compensation also fails', async () => {
    const failure = new Error('database failure');
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const unitOfWork = new TypeOrmOrderUnitOfWork({
      transaction: async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager),
    } as unknown as DataSource);
    await expect(
      unitOfWork.execute(async (transaction) => {
        (transaction as TypeOrmOrderTransactionContext).onRollback(async () => {
          throw new Error('warehouse offline');
        });
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(log).toHaveBeenCalled();
  });
});

it('keeps ORM as the default and rejects unknown inventory backends', () => {
  expect(new InventoryBackendConfig(new ConfigService()).driver).toBe(
    'typeorm',
  );
  expect(
    () =>
      new InventoryBackendConfig(
        new ConfigService({ INVENTORY_DRIVER: 'invalid' }),
      ),
  ).toThrow('INVENTORY_DRIVER');
});

it('retains transaction-scoped ORM reservations for every item in the batch', async () => {
  const inventories = new Map([
    [
      1,
      {
        id: 101,
        productId: 1,
        quantityOnHand: 20,
        quantityReserved: 0,
        availableQuantity: 20,
      },
    ],
    [
      2,
      {
        id: 102,
        productId: 2,
        quantityOnHand: 10,
        quantityReserved: 0,
        availableQuantity: 10,
      },
    ],
  ]);
  const save = vi.fn(async () => {});
  const repository = {
    findOne: async ({ where }: { where: { productId: number } }) =>
      inventories.get(where.productId),
    save,
    create: (value: unknown) => value,
  };
  const manager = {
    getRepository: () => repository,
  } as unknown as EntityManager;
  await new InventoryTypeOrmAdapter().reserve(
    new TypeOrmOrderTransactionContext(manager),
    [
      { productId: 2, quantity: 3 },
      { productId: 1, quantity: 2 },
    ],
    42,
  );
  expect(inventories.get(1)?.quantityReserved).toBe(2);
  expect(inventories.get(2)?.quantityReserved).toBe(3);
  expect(save).toHaveBeenCalledTimes(4);
});
