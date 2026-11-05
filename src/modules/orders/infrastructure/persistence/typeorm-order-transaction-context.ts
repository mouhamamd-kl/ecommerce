import { EntityManager } from 'typeorm';

import { OrderTransactionContext } from '../../application/ports/services/order-transaction-context.js';

export class TypeOrmOrderTransactionContext implements OrderTransactionContext {
  readonly transactionId: symbol;
  private readonly rollbackActions: Array<() => Promise<void>> = [];

  onRollback(action: () => Promise<void>): void {
    this.rollbackActions.push(action);
  }

  async compensate(): Promise<void> {
    const failures: unknown[] = [];
    for (const action of [...this.rollbackActions].reverse()) {
      try {
        await action();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length)
      throw new AggregateError(failures, 'Order rollback compensation failed.');
  }

  constructor(public readonly manager: EntityManager) {
    this.transactionId = Symbol('ORDER_TRANSACTION');
  }
}
