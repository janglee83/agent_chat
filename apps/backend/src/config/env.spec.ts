import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('falls back to defaults', () => {
    const env = loadEnv({});

    expect(env.nodeEnv).toBe('development');
    expect(env.port).toBe(3000);
  });

  it('parses provided values', () => {
    const env = loadEnv({ NODE_ENV: 'production', PORT: '8080', STATIC_DIR: '/srv/public' });

    expect(env).toStrictEqual({ nodeEnv: 'production', port: 8080, staticDir: '/srv/public' });
  });

  it('rejects an invalid port', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow('Invalid PORT');
  });
});
