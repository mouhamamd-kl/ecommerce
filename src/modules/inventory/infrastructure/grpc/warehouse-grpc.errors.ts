import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';

export function grpcErrorCode(error: unknown): number | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'number'
    ? error.code
    : undefined;
}

export function warehouseException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  switch (grpcErrorCode(error)) {
    case status.NOT_FOUND:
      return new NotFoundException(
        'Warehouse inventory or reservation was not found.',
      );
    case status.ALREADY_EXISTS:
      return new ConflictException(
        'Warehouse inventory or reservation conflicts with an existing record.',
      );
    case status.FAILED_PRECONDITION:
      return new ConflictException(
        'Warehouse stock or reservation is no longer available.',
      );
    case status.INVALID_ARGUMENT:
      return new BadRequestException('Invalid warehouse request.');
    case status.DEADLINE_EXCEEDED:
      return new GatewayTimeoutException('Warehouse request timed out.');
    case status.UNAVAILABLE:
    case status.CANCELLED:
      return new ServiceUnavailableException(
        'Warehouse service is unavailable.',
      );
    default:
      return new BadGatewayException('Warehouse request failed.');
  }
}

export function isUncertainGrpcFailure(error: unknown): boolean {
  const code = grpcErrorCode(error);
  return (
    code === undefined ||
    [
      status.UNAVAILABLE,
      status.DEADLINE_EXCEEDED,
      status.CANCELLED,
      status.UNKNOWN,
      status.INTERNAL,
    ].includes(code)
  );
}
