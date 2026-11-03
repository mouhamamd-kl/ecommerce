
import type { Response } from 'express';

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  next: string | null;
  previous: string | null;
}

export interface PaginationMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  links: PaginationLinks;
}

export class ApiResponse {
  static sendResponseSuccess<T = null>(
    response: Response,
    data: T = null as T,
    message = 'Operation successful',
    statusCode = 200,
  ) {
    return response.status(statusCode).json({
      status: 'success',
      message,
      data,
    });
  }

  static sendResponseError<T = null>(
    response: Response,
    message: string | string[] = 'Operation failed',
    statusCode = 400,
    data: T = null as T,
  ) {
    return response.status(statusCode).json({
      status: 'error',
      message,
      data,
    });
  }

  static sendResponsePaginated<T>(
    response: Response,
    items: T[],
    pagination: PaginationMeta,
    message = 'Operation successful',
    statusCode = 200,
  ) {
    return response.status(statusCode).json({
      status: 'success',
      message,
      data: items,
      pagination,
    });
  }

  static paginationMeta(params: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
    baseUrl: string;
  }): PaginationMeta {
    const {
      total,
      count,
      perPage,
      currentPage,
      totalPages,
      baseUrl,
    } = params;

    const pageUrl = (page: number) => {
      const url = new URL(baseUrl);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(perPage));
      return url.toString();
    };

    return {
      total,
      count,
      per_page: perPage,
      current_page: currentPage,
      total_pages: totalPages,
      links: {
        first: totalPages > 0 ? pageUrl(1) : null,
        last: totalPages > 0 ? pageUrl(totalPages) : null,
        next: currentPage < totalPages
          ? pageUrl(currentPage + 1)
          : null,
        previous: currentPage > 1
          ? pageUrl(currentPage - 1)
          : null,
      },
    };
  }

  static tooManyRequests<T = null>(
    response: Response,
    message = 'Too many requests',
    data: T = null as T,
  ) {
    return this.sendResponseError(
      response,
      message,
      429,
      data,
    );
  }
}
