
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];

    if (statusCode >= 500) {
      // Never expose internal exception details to API clients.
      message = 'Internal server error';
    } else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const exceptionMessage = exceptionResponse.message;

        message =
          typeof exceptionMessage === 'string' ||
          (Array.isArray(exceptionMessage) &&
            exceptionMessage.every(
              (item) => typeof item === 'string',
            ))
            ? exceptionMessage as string | string[]
            : exception.message;
      } else {
        message = exception.message;
      }
    } else {
      message = 'Internal server error';
    }

    httpAdapter.reply(
      response,
      {
        status: 'error',
        message,
        data: null,
      },
      statusCode,
    );
  }
}
