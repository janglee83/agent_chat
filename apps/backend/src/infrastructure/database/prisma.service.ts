import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import type { AppEnv } from '../../config/env.js';

import { APP_ENV } from '../../config/config.constants.js';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Single PrismaClient (= single connection pool) for the whole process.
 * Inject this anywhere you need the database; never `new PrismaClient()` yourself.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(APP_ENV) env: AppEnv) {
    super({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });
  }

  public async onModuleInit(): Promise<void> {
    // Connect eagerly so a bad DATABASE_URL fails the boot, not the first request.
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  public async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
