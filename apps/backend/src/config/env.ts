import { isAbsolute, resolve } from 'node:path';

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const DEFAULT_STATIC_DIR = '../frontend/dist';

export interface AppEnv {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly port: number;
  // Directory holding the built frontend; served as static files by the monolith.
  readonly staticDir: string;
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
    throw new Error(`Invalid PORT: "${value}"`);
  }
  return port;
}

function parseStaticDir(value: string = DEFAULT_STATIC_DIR): string {
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    nodeEnv: parseNodeEnv(source['NODE_ENV']),
    port: parsePort(source['PORT']),
    staticDir: parseStaticDir(source['STATIC_DIR']),
  };
}
