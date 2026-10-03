import { EnvValidationError, loadEnv } from './env.js';

const REQUIRED = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
} as const;

describe('loadEnv', () => {
  it('falls back to defaults for optional values', () => {
    const env = loadEnv({ ...REQUIRED });

    expect(env.nodeEnv).toBe('development');
    expect(env.port).toBe(3000);
    expect(env.redisKeyPrefix).toBe('agent-chat:');
  });

  it('parses provided values', () => {
    const env = loadEnv({
      ...REQUIRED,
      NODE_ENV: 'production',
      PORT: '8080',
      STATIC_DIR: '/srv/public',
      REDIS_KEY_PREFIX: 'x:',
    });

    expect(env).toStrictEqual({
      nodeEnv: 'production',
      port: 8080,
      staticDir: '/srv/public',
      databaseUrl: REQUIRED.DATABASE_URL,
      redisUrl: REQUIRED.REDIS_URL,
      redisKeyPrefix: 'x:',
    });
  });

  it('rejects an invalid port', () => {
    expect(() => loadEnv({ ...REQUIRED, PORT: 'abc' })).toThrow(EnvValidationError);
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadEnv({ REDIS_URL: REQUIRED.REDIS_URL })).toThrow(
      'Missing required env DATABASE_URL',
    );
  });

  it('rejects a REDIS_URL with the wrong protocol', () => {
    expect(() => loadEnv({ ...REQUIRED, REDIS_URL: 'http://localhost' })).toThrow(
      'REDIS_URL must use',
    );
  });
});
