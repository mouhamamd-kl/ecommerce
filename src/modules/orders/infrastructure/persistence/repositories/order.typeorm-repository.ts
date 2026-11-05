import { Injectable } from '@nestjs/common';

import {
  DataSource,
  EntityManager,
  Repository,
} from 'typeorm';

import { Order } from '../../../domain/entities/order.entity.js';

import { OrderRepositoryPort } from '../../../application/ports/repositories/order-repository.port.js';

import { OrderTransactionContext } from '../../../application/ports/services/order-transaction-context.js';

import { OrderOrmEntity } from '../entities/order.orm-entity.js';

import { OrderMapper } from '../mappers/order.mapper.js';

import { TypeOrmOrderTransactionContext } from '../typeorm-order-transaction-context.js';

@Injectable()
export class OrderTypeOrmRepository implements OrderRepositoryPort {
  private readonly repository: Repository<OrderOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(OrderOrmEntity);
  }

  private getManager(
    transaction: OrderTransactionContext,
  ): EntityManager {
    if (!(transaction instanceof TypeOrmOrderTransactionContext)) {
      throw new Error('Invalid order transaction context.');
    }

    return transaction.manager;
  }

  private getRepository(
    transaction: OrderTransactionContext,
  ): Repository<OrderOrmEntity> {
    return this.getManager(transaction).getRepository(OrderOrmEntity);
  }

  async findAll(): Promise<Order[]> {
    const orders = await this.repository.find({
      relations: {
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => OrderMapper.toDomain(order));
  }

  async findAllForCustomer(customerId: number): Promise<Order[]> {
    const orders = await this.repository.find({
      where: {
        userId: customerId,
      },
      relations: {
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => OrderMapper.toDomain(order));
  }

  async findById(id: number): Promise<Order | null> {
    const order = await this.repository.findOne({
      where: {
        id,
      },
      relations: {
        items: true,
      },
    });

    return order ? OrderMapper.toDomain(order) : null;
  }

  async findByIdForCustomer(
    customerId: number,
    orderId: number,
  ): Promise<Order | null> {
    const order = await this.repository.findOne({
      where: {
        id: orderId,
        userId: customerId,
      },
      relations: {
        items: true,
      },
    });

    return order ? OrderMapper.toDomain(order) : null;
  }

  async findByIdForUpdate(
    transaction: OrderTransactionContext,
    orderId: number,
  ): Promise<Order | null> {
    const repository = this.getRepository(transaction);

    const order = await repository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        items: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    return order ? OrderMapper.toDomain(order) : null;
  }

  async findByIdForCustomerUpdate(
    transaction: OrderTransactionContext,
    customerId: number,
    orderId: number,
  ): Promise<Order | null> {
    const repository = this.getRepository(transaction);

    const order = await repository.findOne({
      where: {
        id: orderId,
        userId: customerId,
      },
      relations: {
        items: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    return order ? OrderMapper.toDomain(order) : null;
  }

  async save(
    transaction: OrderTransactionContext,
    order: Order,
  ): Promise<Order> {
    const repository = this.getRepository(transaction);

    const entity = OrderMapper.toOrm(order);

    const savedEntity = await repository.save(entity);

    // Reload to ensure generated IDs and database-managed values are present.
    const reloadedEntity = await repository.findOne({
      where: {
        id: savedEntity.id,
      },
      relations: {
        items: true,
      },
    });

    if (!reloadedEntity) {
      throw new Error(
        `Order ${savedEntity.id} could not be reloaded after saving.`,
      );
    }

    return OrderMapper.toDomain(reloadedEntity);
  }
}