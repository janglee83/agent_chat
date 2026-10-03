// DI token for the raw node-redis client. Prefer RedisService; inject this only for
// commands RedisService does not wrap.
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const MAX_RECONNECT_DELAY_MS = 3000;
export const RECONNECT_STEP_MS = 100;
