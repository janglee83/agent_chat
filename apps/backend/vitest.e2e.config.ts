import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// E2E/integration tests hit real PostgreSQL + Redis. Env comes from .env locally
// (dotenv never overrides variables already set, e.g. by CI).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
