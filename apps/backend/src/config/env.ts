import { isAbsolute, resolve } from 'node:path';

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const DEFAULT_STATIC_DIR = '../frontend/dist';
const DEFAULT_REDIS_KEY_PREFIX = 'agent-chat:';

export interface AppEnv {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly port: number;
  // Directory holding the built frontend; served as static files by the monolith.
  readonly staticDir: string;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  // Namespace for every key this app writes, so several apps can share one Redis.
  readonly redisKeyPrefix: string;
}

export class EnvValidationError extends Error {
  public override readonly name = 'EnvValidationError';
}

function parseNodeEnv(value: string | undefined): AppEnv['nodeEnv'] {
  return value === 'production' || value === 'test' ? value : 'development';
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port <= 0 || port > MAX_PORT) {
    throw new EnvValidationError(`Invalid PORT: "${value}"`);
  }
  return port;
}

function parseStaticDir(value: string = DEFAULT_STATIC_DIR): string {
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

function parseUrl(name: string, value: string | undefined, protocols: readonly string[]): string {
  if (value === undefined || value === '') {
    throw new EnvValidationError(`Missing required env ${name}`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EnvValidationError(`Invalid URL in ${name}`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new EnvValidationError(`${name} must use one of: ${protocols.join(', ')}`);
  }
  return value;
}

// Fails fast at boot: a misconfigured process must never start serving traffic.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    nodeEnv: parseNodeEnv(source['NODE_ENV']),
    port: parsePort(source['PORT']),
    staticDir: parseStaticDir(source['STATIC_DIR']),
    databaseUrl: parseUrl('DATABASE_URL', source['DATABASE_URL'], ['postgres:', 'postgresql:']),
    redisUrl: parseUrl('REDIS_URL', source['REDIS_URL'], ['redis:', 'rediss:']),
    redisKeyPrefix: source['REDIS_KEY_PREFIX'] ?? DEFAULT_REDIS_KEY_PREFIX,
  };
}
