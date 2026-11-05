import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  HttpException,
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';

import type { Request, Response } from 'express';

import { CustomerJwtGuard } from '../../../../../core/auth/customer/customer-jwt.guard.js';
import { ApiResponse } from '../../../../../common/helpers/api-response.js';

import { AddCartItemDto } from '../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto.js';
import { CartHttpMapper } from '../mappers/cart-http.mapper.js';

import { GetCartUseCase } from '../../../application/use-cases/get-cart.use-case.js';
import { AddCartItemUseCase } from '../../../application/use-cases/add-cart-item.use-case.js';
import { UpdateCartItemUseCase } from '../../../application/use-cases/update-cart-item.use-case.js';
import { RemoveCartItemUseCase } from '../../../application/use-cases/remove-cart-item.use-case.js';
import { ClearCartUseCase } from '../../../application/use-cases/clear-cart.use-case.js';

import { CartItemNotFoundError } from '../../../application/errors/cart-item-not-found.error.js';
import { ProductNotAvailableError } from '../../../application/errors/product-not-available.error.js';
import { CartNotFoundError } from '../../../application/errors/cart-not-found.error.js';
import { InvalidCartItemQuantityError } from '../../../domain/errors/invalid-cart-item-quantity.error.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
  };
}

@Controller('cart')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtGuard)
export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  private handleError(
    response: Response,
    error: unknown,
  ) {
    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const errorResponse = error.getResponse();

      const message =
        typeof errorResponse === 'object' &&
        errorResponse !== null &&
        'message' in errorResponse
          ? (errorResponse as {
              message: string | string[];
            }).message
          : error.message;

      return ApiResponse.sendResponseError(
        response,
        message,
        statusCode,
      );
    }

    if (
      error instanceof CartItemNotFoundError ||
      error instanceof CartNotFoundError ||
      error instanceof ProductNotAvailableError
    ) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        404,
      );
    }

    if (error instanceof InvalidCartItemQuantityError) {
      return ApiResponse.sendResponseError(
        response,
        error.message,
        400,
      );
    }

    return ApiResponse.sendResponseError(
      response,
      'An unexpected error occurred',
      500,
    );
  }

  @Get()
  async getCart(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.getCartUseCase.execute(
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Cart retrieved successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Post('items')
  async addItem(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddCartItemDto,
    @Res() response: Response,
  ) {
    try {
      const input = CartHttpMapper.toAddCartItemInput(
        request.user.id,
        dto,
      );

      const cart = await this.addCartItemUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Product added to cart successfully',
        201,
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Patch('items/:itemId')
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @Res() response: Response,
  ) {
    try {
      const input = CartHttpMapper.toUpdateCartItemInput(
        request.user.id,
        itemId,
        dto,
      );

      const cart = await this.updateCartItemUseCase.execute(input);

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Cart item updated successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.removeCartItemUseCase.execute(
        request.user.id,
        itemId,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Cart item removed successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  @Delete()
  async clearCart(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.clearCartUseCase.execute(
        request.user.id,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Cart cleared successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }
}