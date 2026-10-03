// globalThis slot where src/instrumentation.ts leaves the running NodeSDK.
export const OTEL_SDK_KEY = Symbol.for('agent-chat.otel-sdk');

export const REQUEST_ID_HEADER = 'x-request-id';
