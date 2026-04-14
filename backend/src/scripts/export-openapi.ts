import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  configureHttpApplication,
  OPEN_API_JSON_PATH,
} from '../core/bootstrap/configure-http-application';

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    const { openApiDocument } = configureHttpApplication(app, {
      useAppLogger: false,
      enableRequestLogging: false,
      exposeOpenApiRoutes: false,
      muteLoggerOutput: true,
    });
    const outputPath = join(process.cwd(), OPEN_API_JSON_PATH.slice(1));
    writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf8');
  } finally {
    await app.close();
  }
}

void exportOpenApi().catch((error: unknown) => {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
  } else {
    process.stderr.write(`${String(error)}\n`);
  }
  process.exit(1);
});
