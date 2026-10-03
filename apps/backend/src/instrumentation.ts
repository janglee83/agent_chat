/**
 * OpenTelemetry bootstrap: traces, metrics and logs → OTLP (otel-lgtm / Alloy).
 *
 * MUST run before any other module is loaded, otherwise nothing gets patched:
 *   node --import ./dist/instrumentation.js dist/main.js
 * The app is ESM, so import-in-the-middle's loader hook is registered first
 * (synchronous module.registerHooks, Node >= 24.11.1); without it auto-instrumentation
 * silently does nothing.
 *
 * Configured only through standard OTEL_* env vars (read by the SDK itself):
 *   OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_PROTOCOL,
 *   OTEL_SDK_DISABLED=true to turn everything off.
 */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { register } from 'import-in-the-middle/register-hooks.mjs';

import { OTEL_SDK_KEY } from './observability/observability.constants.js';

register();

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      // Very chatty, little signal for a web API.
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      // Express 5 (and the `router` package it delegates to) emit one span per layer: body
      // parsers, CLS, pino, Nest's path-mounted middleware — pure noise. The HTTP server span
      // plus instrumentation-nestjs-core's controller spans already describe each request.
      '@opentelemetry/instrumentation-express': { enabled: false },
      '@opentelemetry/instrumentation-router': { enabled: false },
      // Health probes every few seconds would drown real traffic.
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (request) => request.url?.startsWith('/api/health') ?? false,
      },
    }),
    new PrismaInstrumentation(),
  ],
});

sdk.start();

// Lets ObservabilityModule flush pending spans/logs on graceful shutdown without re-importing
// this file (a second import outside --import would start a second, unhooked SDK).
Reflect.set(globalThis, OTEL_SDK_KEY, sdk);
