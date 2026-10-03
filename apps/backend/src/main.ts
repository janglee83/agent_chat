import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';

import type { AppEnv } from './config/env.js';

import { AppModule } from './app.module.js';
import { APP_ENV } from './config/config.constants.js';
import { API_PREFIX } from './constants.js';

async function bootstrap(): Promise<void> {
  // Buffer boot logs until pino is ready, so every line goes through the same structured logger.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const env = app.get<AppEnv>(APP_ENV);

  app.setGlobalPrefix(API_PREFIX);
  // Runs onModuleDestroy / onApplicationShutdown on SIGTERM: closes DB pool and Redis cleanly.
  app.enableShutdownHooks();

  await app.listen(env.port, '0.0.0.0');
  Logger.log(`API listening on :${String(env.port)}/${API_PREFIX} (${env.nodeEnv})`, 'Bootstrap');
}

await bootstrap();
