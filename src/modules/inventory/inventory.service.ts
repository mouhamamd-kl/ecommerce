import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { Inventory } from './entities/inventory.entity.js';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity.js';

import { Product } from '../products/entities/product.entity.js';

import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(InventoryMovement)
    private readonly movementsRepository: Repository<InventoryMovement>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /**
   * Initialize inventory for an existing product.
   */
  async create(dto: CreateInventoryDto): Promise<Inventory> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.inventoryRepository.findOne({
      where: { productId: dto.productId },
    });

    if (existing) {
      throw new ConflictException(
        'Inventory already exists for this product',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const inventoryRepository = manager.getRepository(Inventory);
      const movementRepository =
        manager.getRepository(InventoryMovement);

      const quantity = dto.quantityOnHand ?? 0;

      const inventory = inventoryRepository.create({
        productId: product.id,
        quantityOnHand: quantity,
        quantityReserved: 0,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
      });

      const saved = await inventoryRepository.save(inventory);

      if (quantity > 0) {
        await movementRepository.save(
          movementRepository.create({
            inventoryId: saved.id,
            type: InventoryMovementType.stockAdded,
            quantity,
            quantityBefore: 0,
            quantityAfter: quantity,
            reason: 'Initial inventory',
            referenceOrderId: null,
          }),
        );
      }

      return saved;
    });
  }

  /**
   * List inventory records.
   */
  async findAll(): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      relations: { product: true },
      order: { id: 'DESC' },
    });
  }

  /**
   * Retrieve inventory for a specific product.
   */
  async findByProductId(productId: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { productId },
      relations: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException(
        'Inventory not found for this product',
      );
    }

    return inventory;
  }

  /**
   * Find products at or below their low-stock threshold.
   */
  async findLowStock(): Promise<Inventory[]> {
    const inventory = await this.inventoryRepository.find({
      relations: { product: true },
      order: { quantityOnHand: 'ASC' },
    });

    return inventory.filter(
      (item) =>
        item.quantityOnHand - item.quantityReserved <=
        item.lowStockThreshold,
    );
  }

  /**
   * Add or remove physical stock.
   */
  async adjustStock(
    productId: number,
    dto: AdjustStockDto,
  ): Promise<Inventory> {
    await this.dataSource.transaction(async (manager) => {
      const inventoryRepository = manager.getRepository(Inventory);
      const movementRepository =
        manager.getRepository(InventoryMovement);

      const inventory = await inventoryRepository.findOne({
        where: { productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(
          'Inventory not found for this product',
        );
      }

      const before = inventory.quantityOnHand;

      if (dto.operation === 'add') {
        inventory.quantityOnHand += dto.quantity;
      } else {
        const available =
          inventory.quantityOnHand - inventory.quantityReserved;

        if (dto.quantity > available) {
          throw new BadRequestException(
            'Cannot remove more stock than is available',
          );
        }

        inventory.quantityOnHand -= dto.quantity;
      }

      await inventoryRepository.save(inventory);

      await movementRepository.save(
        movementRepository.create({
          inventoryId: inventory.id,
          type:
            dto.operation === 'add'
              ? InventoryMovementType.stockAdded
              : InventoryMovementType.stockRemoved,
          quantity: dto.quantity,
          quantityBefore: before,
          quantityAfter: inventory.quantityOnHand,
          reason: dto.reason.trim(),
          referenceOrderId: null,
        }),
      );
    });

    return this.findByProductId(productId);
  }

  /**
   * Retrieve stock movement history.
   */
  async findMovements(
    productId?: number,
  ): Promise<InventoryMovement[]> {
    if (productId !== undefined) {
      const inventory = await this.inventoryRepository.findOne({
        where: { productId },
      });

      if (!inventory) {
        throw new NotFoundException(
          'Inventory not found for this product',
        );
      }

      return this.movementsRepository.find({
        where: { inventoryId: inventory.id },
        order: { createdAt: 'DESC' },
        relations: { inventory: true },
      });
    }

    return this.movementsRepository.find({
      relations: { inventory: true },
      order: { createdAt: 'DESC' },
    });
  }
}