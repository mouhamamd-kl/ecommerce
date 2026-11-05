import { CreateOrderDto } from '../dtos/create-order.dto.js';

import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';

import { CreateOrderInput } from '../../../application/contracts/inputs/create-order.input.js';

import { UpdateOrderStatusInput } from '../../../application/contracts/inputs/update-order-status.input.js';

export class OrderHttpMapper {
  static toCreateOrderInput(
    dto: CreateOrderDto,
  ): CreateOrderInput {
    return {
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
    };
  }

  static toUpdateOrderStatusInput(
    orderId: number,
    dto: UpdateOrderStatusDto,
  ): UpdateOrderStatusInput {
    return {
      orderId,
      status: dto.status,
      adminNote: dto.adminNote,
    };
  }
}