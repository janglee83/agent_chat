import type { FactoryProvider } from '@nestjs/common';

import { Logger } from '@nestjs/common';

import type { AppEnv } from '../../config/env.js';
import type { RedisClient } from './redis.client.js';

import { APP_ENV } from '../../config/config.constants.js';
import { buildRedisClient } from './redis.client.js';
import { REDIS_CLIENT } from './redis.constants.js';

export async function createRedisClient(env: AppEnv): Promise<RedisClient> {
  const logger = new Logger('Redis');
  const client = buildRedisClient(env.redisUrl);

  // Without an 'error' listener node-redis rethrows and crashes the process.
  client.on('error', (error: unknown) => {
    logger.error(error instanceof Error ? error.message : String(error));
  });

  await client.connect();
  logger.log('Connected to Redis');
  return client;
}

export const redisClientProvider: FactoryProvider<Promise<RedisClient>> = {
  provide: REDIS_CLIENT,
  inject: [APP_ENV],
  useFactory: createRedisClient,
};
