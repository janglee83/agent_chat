import { createClient } from 'redis';

import { MAX_RECONNECT_DELAY_MS, RECONNECT_STEP_MS } from './redis.constants.js';

// The only place a node-redis client is constructed; its return type is the app's RedisClient.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types -- node-redis client generics are inferred on purpose and exported as RedisClient below
export function buildRedisClient(url: string) {
  return createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * RECONNECT_STEP_MS, MAX_RECONNECT_DELAY_MS),
    },
  });
}

export type RedisClient = ReturnType<typeof buildRedisClient>;
