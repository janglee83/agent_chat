import type { TestingModule } from '@nestjs/testing';

import { Test } from '@nestjs/testing';

import { ConfigModule } from '../src/config/config.module.js';
import { RedisModule } from '../src/infrastructure/redis/redis.module.js';
import { RedisService } from '../src/infrastructure/redis/redis.service.js';

const MESSAGE_TIMEOUT_MS = 2000;

// Runs against a real Redis to verify the commands the unit tests mock.
describe('RedisService (integration)', () => {
  let moduleRef: TestingModule;
  let redis: RedisService;
  const key = `e2e:${crypto.randomUUID()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [ConfigModule, RedisModule] }).compile();
    moduleRef.enableShutdownHooks();
    await moduleRef.init();
    redis = moduleRef.get(RedisService);
  });

  afterAll(async () => {
    await redis.delete(key);
    await moduleRef.close();
  });

  it('round-trips JSON with a TTL', async () => {
    await redis.setJson(key, { hello: 'world' }, 60);

    await expect(redis.getJson(key, (value) => value)).resolves.toStrictEqual({ hello: 'world' });
    await expect(redis.ttl(key)).resolves.toBeGreaterThan(0);
  });

  it('delivers published messages to subscribers', async () => {
    const channel = `${key}:channel`;
    const received = new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('timeout'));
      }, MESSAGE_TIMEOUT_MS);
      void redis.subscribe(channel, resolve);
    });

    // Give SUBSCRIBE a moment to register before publishing.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await redis.publish(channel, 'ping');

    await expect(received).resolves.toBe('ping');
  });
});
