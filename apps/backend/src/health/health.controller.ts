import type { HealthCheckResult } from '@nestjs/terminus';

import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import type { LivenessStatus } from './health.types.js';

import { DatabaseHealthIndicator } from './indicators/database.health.js';
import { RedisHealthIndicator } from './indicators/redis.health.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /**
  Liveness: the process is up. Never touches dependencies (a DB outage must not restart pods).
  */
  @Get()
  public live(): LivenessStatus {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
  Readiness: dependencies are reachable; 503 otherwise, so load balancers stop routing here.
  */
  @Get('ready')
  @HealthCheck()
  public async ready(): Promise<HealthCheckResult> {
    return await this.health.check([
      async () => await this.database.check('database'),
      async () => await this.redis.check('redis'),
    ]);
  }
}
