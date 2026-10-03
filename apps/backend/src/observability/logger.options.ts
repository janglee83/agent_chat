import type { Params } from 'nestjs-pino';

import type { AppEnv } from '../config/env.js';

import { REQUEST_ID_HEADER } from './observability.constants.js';
import { resolveRequestId } from './request-id.js';

/**
 * Structured JSON logs (one line per event) on stdout in every environment except
 * development, where pino-pretty makes them readable. Trace/span ids are added by
 * OpenTelemetry's pino instrumentation, which also ships each record to Loki via OTLP.
 */
export function buildLoggerOptions(env: AppEnv): Params {
  return {
    pinoHttp: {
      level: env.logLevel,
      genReqId: (request, response) => {
        const id = resolveRequestId(request);
        response.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      customAttributeKeys: { reqId: 'requestId' },
      // Never log credentials.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      autoLogging: { ignore: (request) => request.url?.startsWith('/api/health') ?? false },
      ...(env.nodeEnv === 'development' && {
        transport: { target: 'pino-pretty', options: { singleLine: true } },
      }),
    },
  };
}
