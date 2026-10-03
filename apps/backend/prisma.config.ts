import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env by itself; dotenv loads it for the CLI only.
// DATABASE_URL may be absent for `prisma generate` (e.g. Docker build), which needs no connection.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
