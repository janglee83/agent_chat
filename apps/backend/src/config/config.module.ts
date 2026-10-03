import { Global, Module } from '@nestjs/common';

import { APP_ENV } from './config.constants.js';
import { loadEnv } from './env.js';

// Loads and validates env once; inject with `@Inject(APP_ENV) env: AppEnv`.
@Global()
@Module({
  providers: [{ provide: APP_ENV, useFactory: loadEnv }],
  exports: [APP_ENV],
})
export class ConfigModule {}
