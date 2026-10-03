import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { API_PREFIX } from './constants.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  await app.listen(env.port, '0.0.0.0');
  Logger.log(`API listening on :${String(env.port)}/${API_PREFIX} (${env.nodeEnv})`, 'Bootstrap');
}

await bootstrap();
