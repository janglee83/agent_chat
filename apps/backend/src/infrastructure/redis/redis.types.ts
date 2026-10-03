export type { RedisClient } from './redis.client.js';

// Turns untrusted data read back from Redis into a typed value (throw if invalid).
export type Parser<T> = (value: unknown) => T;

export interface RememberOptions<T> {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly load: () => Promise<T>;
  readonly parse: Parser<T>;
}

export type MessageListener = (message: string) => void;

export type Unsubscribe = () => Promise<void>;
