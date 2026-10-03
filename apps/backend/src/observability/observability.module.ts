import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

import { APP_ENV } from '../config/config.constants.js';
import { buildLoggerOptions } from './logger.options.js';
import { resolveRequestId } from './request-id.js';
import { TelemetryShutdownService } from './telemetry-shutdown.service.js';

/**
 * Logs (pino), request context (CLS) and telemetry lifecycle.
 * Traces/metrics themselves are started earlier, in src/instrumentation.ts.
 */
@Global()
@Module({
  imports: [
    // Request-scoped context: inject ClsService and call getId() for the current request id.
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true, idGenerator: resolveRequestId },
    }),
    LoggerModule.forRootAsync({ inject: [APP_ENV], useFactory: buildLoggerOptions }),
  ],
  providers: [TelemetryShutdownService],
})
export class ObservabilityModule {}
