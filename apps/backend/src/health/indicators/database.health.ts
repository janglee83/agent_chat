import type { HealthIndicatorResult } from '@nestjs/terminus';

import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  public async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.prisma.ping();
      return indicator.up();
    } catch (error: unknown) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unreachable' });
    }
  }
}
