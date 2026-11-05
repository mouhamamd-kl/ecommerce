import 'reflect-metadata';
import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  type INestApplication,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { status } from '@grpc/grpc-js';
import type { Server } from 'node:http';
import request from 'supertest';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter.js';
import { InsufficientStockError } from '../src/modules/orders/application/errors/insufficient-stock.error.js';
import { ProductNotFoundError } from '../src/modules/products/application/errors/product-not-found.error.js';
import { warehouseException } from '../src/modules/inventory/infrastructure/grpc/warehouse-grpc.errors.js';

let failure: unknown;

@Controller()
class FailureController {
  @Get('failure')
  fail(): never {
    throw failure;
  }
}

describe('API error responses', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FailureController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    {
      error: new InsufficientStockError(7, 5, 2, 'Classic T-Shirt'),
      statusCode: 409,
      message:
        'Only 2 units of "Classic T-Shirt" are available. Please reduce the quantity in your cart.',
    },
    {
      error: new InsufficientStockError(7, 2, 1, 'Classic T-Shirt'),
      statusCode: 409,
      message:
        'Only 1 unit of "Classic T-Shirt" is available. Please reduce the quantity in your cart.',
    },
    {
      error: new InsufficientStockError(3, 1, 0, 'Classic T-Shirt'),
      statusCode: 409,
      message:
        '"Classic T-Shirt" is currently out of stock. Please remove it from your cart to continue.',
    },
    {
      error: new InsufficientStockError(3, 1, 0),
      statusCode: 409,
      message:
        'This product is currently out of stock. Please remove it from your cart to continue.',
    },
    {
      error: warehouseException({ code: status.FAILED_PRECONDITION }),
      statusCode: 409,
      message: 'Warehouse stock or reservation is no longer available.',
    },
    {
      error: warehouseException({ code: status.UNAVAILABLE }),
      statusCode: 503,
      message: 'Warehouse service is unavailable.',
    },
    {
      error: warehouseException({ code: status.DEADLINE_EXCEEDED }),
      statusCode: 504,
      message: 'Warehouse request timed out.',
    },
    {
      error: warehouseException({
        code: status.INTERNAL,
        details: 'private warehouse details',
      }),
      statusCode: 502,
      message: 'Warehouse request failed.',
    },
    {
      error: new ProductNotFoundError(7),
      statusCode: 404,
      message: 'Product with ID 7 was not found',
    },
    {
      error: new BadRequestException(['quantity must be positive']),
      statusCode: 400,
      message: ['quantity must be positive'],
    },
    {
      error: new HttpException('Please try again later.', 503),
      statusCode: 503,
      message: 'Please try again later.',
    },
    {
      error: new Error('private database details'),
      statusCode: 500,
      message: 'Internal server error',
    },
    {
      error: new InternalServerErrorException('private database details'),
      statusCode: 500,
      message: 'Internal server error',
    },
  ])(
    'returns HTTP $statusCode with the regular error envelope: $message',
    async ({ error, statusCode, message }) => {
      failure = error;
      await request(app.getHttpServer() as Server)
        .get('/failure')
        .expect(statusCode)
        .expect({ status: 'error', message, data: null });
    },
  );
});
