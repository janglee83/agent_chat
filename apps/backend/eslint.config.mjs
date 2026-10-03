// @ts-check
import { node } from '@agent-chat/eslint-config/node';
import { defineConfig } from 'eslint/config';

export default defineConfig(node({ tsconfigRootDir: import.meta.dirname }), {
  // Architecture boundary: drivers live in src/infrastructure only.
  // Features talk to PostgreSQL through PrismaService and to Redis through RedisService.
  name: 'backend/infrastructure-boundary',
  files: ['src/**/*.ts'],
  ignores: ['src/infrastructure/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'console', message: 'Use Logger from @nestjs/common.' },
          { name: 'redis', message: 'Inject RedisService instead of using the driver.' },
          { name: 'pg', message: 'Inject PrismaService instead of using the driver.' },
          { name: '@prisma/adapter-pg', message: 'Inject PrismaService instead.' },
        ],
        patterns: [
          { group: ['**/frontend/**'], message: 'Backend must not import frontend code.' },
          { group: ['@redis/*'], message: 'Inject RedisService instead of using the driver.' },
          {
            regex: String.raw`generated/prisma/client(\.js)?$`,
            importNames: ['PrismaClient'],
            message: 'Inject PrismaService; never instantiate PrismaClient (one pool per process).',
          },
        ],
      },
    ],
  },
});
