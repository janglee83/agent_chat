import type { IncomingMessage } from 'node:http';

import { randomUUID } from 'node:crypto';

import { REQUEST_ID_HEADER } from './observability.constants.js';

const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID = /^[\w.:\-]+$/v;

/**
 * One request id shared by the HTTP logger (pino-http) and the request context (CLS).
 * Reuses a caller's x-request-id when it is safe, otherwise generates one, and writes it
 * back to the request so whichever middleware runs second sees the same value.
 */
export function resolveRequestId(request: IncomingMessage): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const id =
    candidate !== undefined &&
    candidate.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID.test(candidate)
      ? candidate
      : randomUUID();
  // Intentional mutation: the id must be visible to the other middleware reading this request.
  // eslint-disable-next-line no-param-reassign -- shared request id is stored on the request itself
  request.headers[REQUEST_ID_HEADER] = id;
  return id;
}
