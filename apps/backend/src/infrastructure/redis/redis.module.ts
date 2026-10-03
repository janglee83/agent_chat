import { Global, Module } from '@nestjs/common';

import { REDIS_CLIENT } from './redis.constants.js';
import { redisClientProvider } from './redis.provider.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [redisClientProvider, RedisService],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
