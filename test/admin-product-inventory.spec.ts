import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { Product } from '../src/modules/products/domain/entities/product.entity.js';
import { GetProductUseCase } from '../src/modules/products/application/use-cases/get-product.use-case.js';
import { GetActiveProductUseCase } from '../src/modules/products/application/use-cases/get-active-product.use-case.js';
import type { ProductRepositoryPort } from '../src/modules/products/application/ports/repositories/product-repository.port.js';
import { ProductNotFoundError } from '../src/modules/products/application/errors/product-not-found.error.js';
import { ProductInventoryTypeOrmAdapter } from '../src/modules/products/infrastructure/adapters/product-inventory.typeorm-adapter.js';
import { InventoryOrmEntity } from '../src/modules/inventory/infrastructure/persistence/entities/inventory.orm-entity.js';

describe('admin product inventory with TypeORM', () => {
  const product = new Product(7, 'Test product', 10, false, []);
  const products = {
    findById: async () => product,
  } as unknown as ProductRepositoryPort;

  function inventoryAdapter(inventory: InventoryOrmEntity | null) {
    const findOneBy = vi.fn(async () => inventory);
    const adapter = new ProductInventoryTypeOrmAdapter({
      getRepository: () => ({ findOneBy }),
    } as unknown as DataSource);
    return { adapter, findOneBy };
  }

  it('returns current stock with admin details, including inactive products', async () => {
    const inventory = Object.assign(new InventoryOrmEntity(), {
      productId: 7,
      quantityOnHand: 20,
      quantityReserved: 3,
      lowStockThreshold: 5,
    });
    const { adapter, findOneBy } = inventoryAdapter(inventory);
    const result = await new GetProductUseCase(products, adapter).execute(7);
    expect(result).toMatchObject({
      id: 7,
      name: 'Test product',
      isActive: false,
      inventory: {
        quantityOnHand: 20,
        quantityReserved: 3,
        availableQuantity: 17,
        lowStockThreshold: 5,
        isLowStock: false,
      },
    });
    expect(findOneBy).toHaveBeenCalledWith({ productId: 7 });
  });

  it('distinguishes an inventory record with zero stock from uninitialized inventory', async () => {
    const emptyStock = Object.assign(new InventoryOrmEntity(), {
      productId: 7,
      quantityOnHand: 0,
      quantityReserved: 0,
      lowStockThreshold: 5,
    });
    const emptyResult = await new GetProductUseCase(
      products,
      inventoryAdapter(emptyStock).adapter,
    ).execute(7);
    expect(emptyResult.inventory).toMatchObject({
      availableQuantity: 0,
      isLowStock: true,
    });
    const missingResult = await new GetProductUseCase(
      products,
      inventoryAdapter(null).adapter,
    ).execute(7);
    expect(missingResult.inventory).toBeNull();
  });

  it('does not query inventory for a nonexistent product', async () => {
    const { adapter, findOneBy } = inventoryAdapter(null);
    const products = {
      findById: async () => null,
    } as unknown as ProductRepositoryPort;
    await expect(
      new GetProductUseCase(products, adapter).execute(999),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(findOneBy).not.toHaveBeenCalled();
  });

  it('keeps the public product response independent of admin inventory details', async () => {
    const products = {
      findActiveById: async () => new Product(7, 'Test product', 10, true, []),
    } as unknown as ProductRepositoryPort;
    const result = await new GetActiveProductUseCase(products).execute(7);
    expect(result).toEqual({
      id: 7,
      name: 'Test product',
      price: 10,
      isActive: true,
      categoryIds: [],
      photos: [],
    });
  });
});
