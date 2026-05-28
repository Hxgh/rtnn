import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  getBackendMessageCode,
  localizeBackendPayload,
} from '../i18n/backend-messages';
import { getRequestLocale } from '../i18n/request-locale';
import { AppLogger } from '../../core/logger/app-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const locale = getRequestLocale(request);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawPayload =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    const localizedPayload = localizeBackendPayload(rawPayload, locale);
    const normalizedPayload = normalizeErrorPayload(
      localizedPayload,
      status,
      rawPayload,
    );
    const legacyErrorPayload =
      sanitizeErrorDetails(localizedPayload) ?? normalizedPayload.message;

    this.logger.error(
      {
        path: request.url,
        method: request.method,
        status,
        locale,
        message: legacyErrorPayload,
      },
      exception instanceof Error ? exception.stack : undefined,
      AllExceptionsFilter.name,
    );

    response.setHeader('Content-Language', locale);
    response.status(status).json({
      statusCode: status,
      path: request.url,
      method: request.method,
      locale,
      error: legacyErrorPayload,
      code: normalizedPayload.code,
      message: normalizedPayload.message,
      ...(normalizedPayload.details
        ? { details: normalizedPayload.details }
        : {}),
      timestamp: new Date().toISOString(),
    });
  }
}

function normalizeErrorPayload(
  payload: unknown,
  status: number,
  rawPayload: unknown,
) {
  if (typeof payload === 'string') {
    return {
      code:
        (typeof rawPayload === 'string'
          ? getBackendMessageCode(rawPayload)
          : undefined) ?? defaultCodeForStatus(status),
      message: payload,
      details: undefined,
    };
  }

  if (Array.isArray(payload)) {
    return {
      code: 'VALIDATION_FAILED',
      message: payload,
      details: undefined,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      code: defaultCodeForStatus(status),
      message: normalizePrimitiveMessage(payload),
      details: undefined,
    };
  }

  const record = payload as Record<string, unknown>;
  const message =
    typeof record.message === 'string' || Array.isArray(record.message)
      ? record.message
      : typeof record.error === 'string'
        ? record.error
        : 'Unexpected error';
  const code =
    typeof record.code === 'string'
      ? record.code
      : (resolveCodeFromRawPayload(rawPayload) ??
        (typeof message === 'string'
          ? (getBackendMessageCode(message) ?? defaultCodeForStatus(status))
          : 'VALIDATION_FAILED'));
  const details = Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => !['code', 'message', 'error', 'statusCode'].includes(key),
    ),
  );
  const sanitizedDetails = sanitizeErrorDetails(details);

  return {
    code,
    message,
    details:
      isNonEmptyRecord(sanitizedDetails) || Array.isArray(sanitizedDetails)
        ? sanitizedDetails
        : undefined,
  };
}

function resolveCodeFromRawPayload(rawPayload: unknown) {
  if (typeof rawPayload === 'string') {
    return getBackendMessageCode(rawPayload);
  }
  if (!rawPayload || typeof rawPayload !== 'object') {
    return undefined;
  }
  const message = (rawPayload as Record<string, unknown>).message;
  if (typeof message === 'string') {
    return getBackendMessageCode(message);
  }
  return undefined;
}

function normalizePrimitiveMessage(payload: unknown) {
  if (payload === null || payload === undefined || payload === '') {
    return 'Unexpected error';
  }
  if (
    typeof payload === 'string' ||
    typeof payload === 'number' ||
    typeof payload === 'boolean' ||
    typeof payload === 'bigint'
  ) {
    return String(payload);
  }
  return 'Unexpected error';
}

function sanitizeErrorDetails(details: unknown): unknown {
  if (Array.isArray(details)) {
    return details
      .map((item) => sanitizeErrorDetails(item))
      .filter((item) => item !== undefined);
  }

  if (!details || typeof details !== 'object') {
    return details;
  }

  const sanitizedEntries = Object.entries(
    details as Record<string, unknown>,
  ).flatMap(([key, value]) =>
    isSensitiveDetailKey(key)
      ? []
      : [[key, sanitizeErrorDetails(value)] as const],
  );

  const sanitized = Object.fromEntries(
    sanitizedEntries.filter(([, value]) => value !== undefined),
  );
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function isSensitiveDetailKey(key: string) {
  return /token|secret|password|authorization|cookie/i.test(key);
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function defaultCodeForStatus(status: HttpStatus) {
  if (status === HttpStatus.BAD_REQUEST) {
    return 'VALIDATION_FAILED';
  }
  if (status === HttpStatus.UNAUTHORIZED) {
    return 'INVALID_OR_EXPIRED_ACCESS_TOKEN';
  }
  if (status === HttpStatus.FORBIDDEN) {
    return 'PERMISSION_DENIED';
  }
  if (status === HttpStatus.NOT_FOUND) {
    return 'NOT_FOUND';
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return 'LOGIN_RATE_LIMITED';
  }
  return 'INTERNAL_SERVER_ERROR';
}
