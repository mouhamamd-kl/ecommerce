import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';

import { ProductOrmEntity } from '../../../products/infrastructure/persistence/entities/product.orm-entity.js';

import {
  ProductCatalogPort,
  CheckoutProduct,
} from '../../application/ports/services/product-catalog.port.js';

import { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';

import { TypeOrmOrderTransactionContext } from '../persistence/typeorm-order-transaction-context.js';

@Injectable()
export class ProductCatalogTypeOrmAdapter implements ProductCatalogPort {
  private getManager(
    transaction: OrderTransactionContext,
  ): EntityManager {
    if (!(transaction instanceof TypeOrmOrderTransactionContext)) {
      throw new Error('Invalid order transaction context.');
    }

    return transaction.manager;
  }

  async findActiveByIds(
    transaction: OrderTransactionContext,
    productIds: number[],
  ): Promise<CheckoutProduct[]> {
    if (productIds.length === 0) {
      return [];
    }

    const repository = this.getManager(transaction).getRepository(ProductOrmEntity);

    const products = await repository.find({
      where: {
        id: In(productIds),
        isActive: true,
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
    }));
  }
}