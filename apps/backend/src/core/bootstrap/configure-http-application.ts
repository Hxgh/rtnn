import {
  RequestMethod,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express, NextFunction, Request, Response } from 'express';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import {
  attachRequestLocale,
  type LocaleRequest,
} from '../../common/i18n/request-locale';
import { HttpLoggingInterceptor } from '../../common/interceptors/http-logging.interceptor';
import { TEMPLATE_DISPLAY, TEMPLATE_IDENTITY } from '@rtnn/config';
import { AppConfigService } from '../config/app-config.service';
import { AppLogger } from '../logger/app-logger.service';

export const API_GLOBAL_PREFIX = 'api/v1';
export const OPEN_API_JSON_PATH = '/openapi.json';
export const OPEN_API_UI_PATH = 'docs';

const GLOBAL_PREFIX_EXCLUSIONS = [
  { path: 'healthz', method: RequestMethod.GET },
  { path: 'readyz', method: RequestMethod.GET },
  { path: 'version', method: RequestMethod.GET },
  { path: 'openapi.json', method: RequestMethod.GET },
] as const;

export interface ConfigureHttpApplicationOptions {
  enableShutdownHooks?: boolean;
  useAppLogger?: boolean;
  enableRequestLogging?: boolean;
  exposeOpenApiRoutes?: boolean;
  muteLoggerOutput?: boolean;
}

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle(`${TEMPLATE_IDENTITY.projectId} backend api`)
    .setDescription(`Template backend kernel for ${TEMPLATE_DISPLAY.brand}`)
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
}

export function configureHttpApplication(
  app: INestApplication,
  options: ConfigureHttpApplicationOptions = {},
) {
  const {
    enableShutdownHooks = false,
    useAppLogger = true,
    enableRequestLogging = true,
    exposeOpenApiRoutes = true,
    muteLoggerOutput = false,
  } = options;
  const logger = app.get(AppLogger);
  const appConfig = app.get(AppConfigService);

  logger.setMuted(muteLoggerOutput);
  if (useAppLogger) {
    app.useLogger(logger);
  }
  if (enableShutdownHooks) {
    app.enableShutdownHooks();
  }

  const server = app.getHttpAdapter().getInstance() as Express;
  server.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || appConfig.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept-Language',
      'accept-language',
      'X-RTNN-Client-Release-Token',
      'x-rtnn-client-release-token',
    ],
    exposedHeaders: ['Content-Language'],
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [...GLOBAL_PREFIX_EXCLUSIONS],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  if (enableRequestLogging) {
    app.useGlobalInterceptors(new HttpLoggingInterceptor(logger));
  }

  server.use((req: Request, res: Response, next: NextFunction) => {
    const locale = attachRequestLocale(req as LocaleRequest);
    res.setHeader('Content-Language', locale);
    next();
  });

  const openApiDocument = SwaggerModule.createDocument(
    app,
    buildSwaggerConfig(),
    {
      ignoreGlobalPrefix: false,
    },
  );
  if (exposeOpenApiRoutes) {
    SwaggerModule.setup(OPEN_API_UI_PATH, app, openApiDocument);
    server.get(OPEN_API_JSON_PATH, (_req: Request, res: Response) => {
      res.json(openApiDocument);
    });
  }

  return {
    appConfig,
    logger,
    openApiDocument,
  };
}
