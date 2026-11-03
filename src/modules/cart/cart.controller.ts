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

import type { Request, Response } from 'express';

import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { CustomerJwtGuard } from '../../core/auth/customer/customer-jwt.guard.js';
import { ApiResponse } from '../../common/helpers/api-response.js';
import { ApiBearerAuth } from '@nestjs/swagger';


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
    private readonly cartService: CartService,
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
          ? (errorResponse as { message: string | string[] }).message
          : error.message;

      return ApiResponse.sendResponseError(
        response,
        message,
        statusCode,
      );
    }

    return ApiResponse.sendResponseError(
      response,
      'An unexpected error occurred',
      500,
    );
  }

  /**
   * GET /cart
   * Get the authenticated customer's cart.
   */
  @Get()
  async getCart(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.cartService.getCart(
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

  /**
   * POST /cart/items
   * Add a product to the cart.
   */
  @Post('items')
  async addItem(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddCartItemDto,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.cartService.addItem(
        request.user.id,
        dto,
      );

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

  /**
   * PATCH /cart/items/:itemId
   * Update a cart item's quantity.
   */
  @Patch('items/:itemId')
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.cartService.updateItem(
        request.user.id,
        itemId,
        dto,
      );

      return ApiResponse.sendResponseSuccess(
        response,
        cart,
        'Cart item updated successfully',
      );
    } catch (error) {
      return this.handleError(response, error);
    }
  }

  /**
   * DELETE /cart/items/:itemId
   * Remove one item from the cart.
   */
  @Delete('items/:itemId')
  async removeItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.cartService.removeItem(
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

  /**
   * DELETE /cart
   * Empty the cart.
   */
  @Delete()
  async clearCart(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    try {
      const cart = await this.cartService.clearCart(
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