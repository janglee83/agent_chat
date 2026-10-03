import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { loadEnv } from './config/env.js';
import { API_PREFIX } from './constants.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    // Monolith: the same process serves the API under /api and the built SPA everywhere else.
    ServeStaticModule.forRoot({
      rootPath: loadEnv().staticDir,
      exclude: [`/${API_PREFIX}/{*path}`],
    }),
    HealthModule,
  ],
})
export class AppModule {}
