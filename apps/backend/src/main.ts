import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  API_GLOBAL_PREFIX,
  configureHttpApplication,
} from './core/bootstrap/configure-http-application';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const { appConfig, logger } = configureHttpApplication(app, {
    enableShutdownHooks: true,
  });

  await app.listen(appConfig.port);
  logger.log(
    {
      port: appConfig.port,
      env: appConfig.nodeEnv,
      prefix: `/${API_GLOBAL_PREFIX}`,
    },
    'Application started',
  );
}

void bootstrap();
