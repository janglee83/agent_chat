import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import type { AppEnv } from './config/env.js';

import { APP_ENV } from './config/config.constants.js';
import { ConfigModule } from './config/config.module.js';
import { API_PREFIX } from './constants.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';

@Module({
  imports: [
    // Infrastructure (global): config, PostgreSQL via Prisma, Redis.
    ConfigModule,
    DatabaseModule,
    RedisModule,
    // Monolith: the same process serves the API under /api and the built SPA everywhere else.
    ServeStaticModule.forRootAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => [
        { rootPath: env.staticDir, exclude: [`/${API_PREFIX}/{*path}`] },
      ],
    }),
    // Features
    HealthModule,
  ],
})
export class AppModule {}
