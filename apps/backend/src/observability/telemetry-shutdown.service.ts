import type { OnApplicationShutdown } from '@nestjs/common';

import { Injectable } from '@nestjs/common';

import { OTEL_SDK_KEY } from './observability.constants.js';

interface ShutdownCapable {
  readonly shutdown: () => Promise<void>;
}

function isShutdownCapable(value: unknown): value is ShutdownCapable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'shutdown' in value &&
    typeof value.shutdown === 'function'
  );
}

/**
Flushes buffered spans, metrics and logs to the collector before the process exits.
*/
@Injectable()
export class TelemetryShutdownService implements OnApplicationShutdown {
  public async onApplicationShutdown(): Promise<void> {
    const sdk: unknown = Reflect.get(globalThis, OTEL_SDK_KEY);
    if (isShutdownCapable(sdk)) {
      await sdk.shutdown();
    }
  }
}
