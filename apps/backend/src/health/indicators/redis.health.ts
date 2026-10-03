import type { HealthIndicatorResult } from '@nestjs/terminus';

import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { RedisService } from '../../infrastructure/redis/redis.service.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  public async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.redis.ping();
      return indicator.up();
    } catch (error: unknown) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unreachable' });
    }
  }
}
