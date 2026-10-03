import type { OnApplicationShutdown } from '@nestjs/common';

import { Inject, Injectable, Logger } from '@nestjs/common';

import type { AppEnv } from '../../config/env.js';
import type {
  MessageListener,
  Parser,
  RedisClient,
  RememberOptions,
  Unsubscribe,
} from './redis.types.js';

import { APP_ENV } from '../../config/config.constants.js';
import { REDIS_CLIENT } from './redis.constants.js';

/**
 * The one entry point for talking to Redis.
 *
 * - Every key and channel is namespaced with REDIS_KEY_PREFIX automatically:
 *   callers pass logical keys (`session:42`), never prefixed ones.
 * - JSON values are validated on read via a `Parser`, so cached data is never trusted blindly.
 * - Pub/Sub uses a dedicated connection (a subscribed connection cannot run other commands).
 */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  // Promise, not client: concurrent subscribe() calls must share one connection.
  private subscriber: Promise<RedisClient> | undefined;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: RedisClient,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  // ---------- strings ----------

  public async get(key: string): Promise<string | null> {
    return await this.client.get(this.key(key));
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await (ttlSeconds === undefined
      ? this.client.set(this.key(key), value)
      : this.client.set(this.key(key), value, {
          expiration: { type: 'EX', value: assertTtl(ttlSeconds) },
        }));
  }

  // ---------- JSON ----------

  public async getJson<T>(key: string, parse: Parser<T>): Promise<T | null> {
    const raw = await this.get(key);
    return raw === null ? null : parse(JSON.parse(raw) as unknown);
  }

  public async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
  Cache-aside: return the cached value, or load it, cache it for `ttlSeconds` and return it.
  */
  public async remember<T>({ key, ttlSeconds, load, parse }: RememberOptions<T>): Promise<T> {
    const cached = await this.getJson(key, parse);
    if (cached !== null) {
      return cached;
    }
    const fresh = await load();
    await this.setJson(key, fresh, ttlSeconds);
    return fresh;
  }

  // ---------- keys ----------

  public async delete(...keys: readonly string[]): Promise<number> {
    return keys.length === 0 ? 0 : await this.client.del(keys.map((key) => this.key(key)));
  }

  public async exists(key: string): Promise<boolean> {
    return (await this.client.exists(this.key(key))) > 0;
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.expire(this.key(key), assertTtl(ttlSeconds))) === 1;
  }

  /**
  Seconds to live; -1 = no expiry, -2 = key does not exist.
  */
  public async ttl(key: string): Promise<number> {
    return await this.client.ttl(this.key(key));
  }

  public async increment(key: string, by = 1): Promise<number> {
    return await this.client.incrBy(this.key(key), by);
  }

  // ---------- pub/sub ----------

  public async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(this.key(channel), message);
  }

  public async subscribe(channel: string, listener: MessageListener): Promise<Unsubscribe> {
    const subscriber = await this.getSubscriber();
    const prefixed = this.key(channel);
    await subscriber.subscribe(prefixed, listener);
    return async () => {
      await subscriber.unsubscribe(prefixed, listener);
    };
  }

  // ---------- health & lifecycle ----------

  public async ping(): Promise<void> {
    await this.client.ping();
  }

  public async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.closeSubscriber(), this.client.close()]);
    this.logger.log('Redis connections closed');
  }

  private key(key: string): string {
    return `${this.env.redisKeyPrefix}${key}`;
  }

  private async getSubscriber(): Promise<RedisClient> {
    this.subscriber ??= this.connectSubscriber();
    return await this.subscriber;
  }

  private async closeSubscriber(): Promise<void> {
    if (this.subscriber === undefined) {
      return;
    }
    try {
      const subscriber = await this.subscriber;
      await subscriber.close();
    } catch (error: unknown) {
      // A subscriber that never connected has nothing to close.
      this.logger.warn(
        `Subscriber close skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async connectSubscriber(): Promise<RedisClient> {
    const subscriber = this.client.duplicate();
    subscriber.on('error', (error: unknown) => {
      this.logger.error(error instanceof Error ? error.message : String(error));
    });
    await subscriber.connect();
    return subscriber;
  }
}

function assertTtl(ttlSeconds: number): number {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new RangeError(`TTL must be a positive integer of seconds, got ${String(ttlSeconds)}`);
  }
  return ttlSeconds;
}
