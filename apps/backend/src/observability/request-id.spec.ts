import type { IncomingMessage } from 'node:http';

import { resolveRequestId } from './request-id.js';

function requestWith(headers: IncomingMessage['headers']): IncomingMessage {
  return { headers } as IncomingMessage;
}

describe('resolveRequestId', () => {
  it('reuses a safe incoming id', () => {
    const request = requestWith({ 'x-request-id': 'abc-123' });

    expect(resolveRequestId(request)).toBe('abc-123');
  });

  it('generates an id when none is sent and stores it on the request', () => {
    const request = requestWith({});
    const id = resolveRequestId(request);

    expect(id).toMatch(/^[\da-f\-]{36}$/v);
    expect(request.headers['x-request-id']).toBe(id);
  });

  it('is stable across calls on the same request', () => {
    const request = requestWith({});

    expect(resolveRequestId(request)).toBe(resolveRequestId(request));
  });

  it('replaces an unsafe incoming id', () => {
    const request = requestWith({ 'x-request-id': 'bad id\n<script>' });

    expect(resolveRequestId(request)).not.toContain('<');
  });
});
