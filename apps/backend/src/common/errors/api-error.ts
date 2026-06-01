import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiErrorCode } from '@rtnn/shared-types';

export type ApiErrorDetails = Record<string, unknown>;

export function createApiErrorPayload(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return {
    code,
    message,
    ...(details ?? {}),
  };
}

export function apiBadRequest(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new BadRequestException(createApiErrorPayload(code, message, details));
}

export function apiUnauthorized(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new UnauthorizedException(
    createApiErrorPayload(code, message, details),
  );
}

export function apiForbidden(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new ForbiddenException(createApiErrorPayload(code, message, details));
}

export function apiNotFound(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new NotFoundException(createApiErrorPayload(code, message, details));
}

export function apiTooManyRequests(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new HttpException(
    createApiErrorPayload(code, message, details),
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export function apiInternalServerError(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails,
) {
  return new InternalServerErrorException(
    createApiErrorPayload(code, message, details),
  );
}
