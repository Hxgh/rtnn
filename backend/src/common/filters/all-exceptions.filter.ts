import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { localizeBackendPayload } from '../i18n/backend-messages';
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
    const errorPayload =
      exception instanceof HttpException
        ? localizeBackendPayload(exception.getResponse(), locale)
        : localizeBackendPayload('Internal server error', locale);

    this.logger.error(
      {
        path: request.url,
        method: request.method,
        status,
        locale,
        message: errorPayload,
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
      error: errorPayload,
      timestamp: new Date().toISOString(),
    });
  }
}
