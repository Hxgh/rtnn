import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(options: {
  acceptLanguage?: string;
  locale?: string;
  method?: string;
  url?: string;
}) {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    method: options.method ?? 'GET',
    url: options.url ?? '/api/v1/example',
    header: jest.fn((name: string) => {
      if (name.toLowerCase() === 'accept-language') {
        return options.acceptLanguage;
      }
      return undefined;
    }),
    locale: options.locale,
  };

  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never,
    request,
    response,
  };
}

describe('AllExceptionsFilter', () => {
  const logger = {
    error: jest.fn(),
  };
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new AllExceptionsFilter(logger as never);
  });

  it('returns localized error payloads with stable metadata', () => {
    const { host, response } = createHost({
      locale: 'zh-CN',
      method: 'POST',
      url: '/api/v1/admin',
    });

    filter.catch(
      new BadRequestException({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        requiredPermissions: ['admin:users:view'],
      }),
      host,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Language',
      'zh-CN',
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/api/v1/admin',
        method: 'POST',
        locale: 'zh-CN',
        error: {
          code: 'PERMISSION_DENIED',
          message: '权限不足',
          requiredPermissions: ['admin:users:view'],
        },
        code: 'PERMISSION_DENIED',
        message: '权限不足',
        details: {
          requiredPermissions: ['admin:users:view'],
        },
      }),
    );
  });

  it('falls back to request language and localizes unexpected errors', () => {
    const { host, response } = createHost({
      acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
    });

    filter.catch(new Error('boom'), host);

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Language',
      'zh-CN',
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        locale: 'zh-CN',
        error: '服务器内部错误',
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      }),
    );
  });

  it('keeps English payloads when the request locale is English', () => {
    const { host, response } = createHost({
      locale: 'en-US',
    });

    filter.catch(
      new InternalServerErrorException('Internal server error'),
      host,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Language',
      'en-US',
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en-US',
        error: expect.objectContaining({
          message: 'Internal server error',
        }),
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      }),
    );
  });

  it('removes sensitive fields from error details', () => {
    const { host, response } = createHost({
      locale: 'en-US',
    });

    filter.catch(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Invalid payload',
        token: 'raw-token',
        nested: {
          refreshSecret: 'raw-secret',
          retryAfterSeconds: 30,
        },
      }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_FAILED',
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid payload',
          nested: {
            retryAfterSeconds: 30,
          },
        },
        details: {
          nested: {
            retryAfterSeconds: 30,
          },
        },
      }),
    );
  });
});
