import type { AppEnv } from '../../config/env.js';
import type { RedisClient } from './redis.types.js';

import { RedisService } from './redis.service.js';

const env: AppEnv = {
  nodeEnv: 'test',
  port: 3000,
  staticDir: '/tmp',
  databaseUrl: 'postgresql://localhost/db',
  redisUrl: 'redis://localhost:6379',
  redisKeyPrefix: 'test:',
};

function createClientMock() {
  return {
    get: vi.fn<(key: string) => Promise<string | null>>(),
    set: vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('OK'),
    del: vi.fn<(keys: string[]) => Promise<number>>(),
    exists: vi.fn<(key: string) => Promise<number>>(),
    expire: vi.fn<(key: string, ttl: number) => Promise<number>>(),
    ttl: vi.fn<(key: string) => Promise<number>>(),
    incrBy: vi.fn<(key: string, by: number) => Promise<number>>(),
    publish: vi.fn<(channel: string, message: string) => Promise<number>>(),
    ping: vi.fn<() => Promise<string>>().mockResolvedValue('PONG'),
    close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

type ClientMock = ReturnType<typeof createClientMock>;

describe('RedisService', () => {
  let client: ClientMock;
  let service: RedisService;

  beforeEach(() => {
    client = createClientMock();
    service = new RedisService(client as unknown as RedisClient, env);
  });

  it('prefixes every key', async () => {
    client.get.mockResolvedValue('v');

    await expect(service.get('user:1')).resolves.toBe('v');
    expect(client.get).toHaveBeenCalledWith('test:user:1');
  });

  it('sets a value with an expiration', async () => {
    await service.set('k', 'v', 60);

    expect(client.set).toHaveBeenCalledWith('test:k', 'v', {
      expiration: { type: 'EX', value: 60 },
    });
  });

  it('rejects a non-positive TTL', async () => {
    await expect(service.set('k', 'v', 0)).rejects.toThrow(RangeError);
    expect(client.set).not.toHaveBeenCalled();
  });

  it('validates JSON on read through the parser', async () => {
    client.get.mockResolvedValue('{"id":1}');
    const parse = vi.fn((value: unknown) => value as { id: number });

    await expect(service.getJson('k', parse)).resolves.toStrictEqual({ id: 1 });
    expect(parse).toHaveBeenCalledWith({ id: 1 });
  });

  it('returns null for a missing JSON key without parsing', async () => {
    client.get.mockResolvedValue(null);
    const parse = vi.fn();

    await expect(service.getJson('k', parse)).resolves.toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it('remember() loads and caches on a miss', async () => {
    client.get.mockResolvedValue(null);
    const load = vi.fn<() => Promise<number>>().mockResolvedValue(42);

    const value = await service.remember({ key: 'n', ttlSeconds: 30, load, parse: Number });

    expect(value).toBe(42);
    expect(load).toHaveBeenCalledOnce();
    expect(client.set).toHaveBeenCalledWith('test:n', '42', {
      expiration: { type: 'EX', value: 30 },
    });
  });

  it('remember() serves from cache on a hit', async () => {
    client.get.mockResolvedValue('7');
    const load = vi.fn<() => Promise<number>>().mockResolvedValue(42);

    await expect(service.remember({ key: 'n', ttlSeconds: 30, load, parse: Number })).resolves.toBe(
      7,
    );
    expect(load).not.toHaveBeenCalled();
  });

  it('skips DEL when no keys are given', async () => {
    await expect(service.delete()).resolves.toBe(0);
    expect(client.del).not.toHaveBeenCalled();
  });

  it('deletes prefixed keys', async () => {
    client.del.mockResolvedValue(2);

    await expect(service.delete('a', 'b')).resolves.toBe(2);
    expect(client.del).toHaveBeenCalledWith(['test:a', 'test:b']);
  });

  it('prefixes pub/sub channels', async () => {
    client.publish.mockResolvedValue(1);

    await service.publish('chat:1', 'hi');

    expect(client.publish).toHaveBeenCalledWith('test:chat:1', 'hi');
  });

  it('closes the connection on shutdown', async () => {
    await service.onApplicationShutdown();

    expect(client.close).toHaveBeenCalledOnce();
  });
});
