import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { type OrderUnitOfWorkPort } from '../../application/ports/services/order-unit-of-work.port.js';

import { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';

import { TypeOrmOrderTransactionContext } from './typeorm-order-transaction-context.js';

@Injectable()
export class TypeOrmOrderUnitOfWork implements OrderUnitOfWorkPort {
  private readonly logger = new Logger(TypeOrmOrderUnitOfWork.name);
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(
    work: (transaction: OrderTransactionContext) => Promise<T>,
  ): Promise<T> {
    let context: TypeOrmOrderTransactionContext | undefined;
    try {
      return await this.dataSource.transaction(async (manager) => {
        context = new TypeOrmOrderTransactionContext(manager);
        return work(context);
      });
    } catch (error) {
      try {
        await context?.compensate();
      } catch (compensationError) {
        this.logger.error(
          'Warehouse reservation requires reconciliation after checkout rollback.',
          compensationError,
        );
      }
      throw error;
    }
  }
}
