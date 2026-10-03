import { Controller, Get } from '@nestjs/common';

import type { HealthStatus } from './health.service.js';

import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  public check(): HealthStatus {
    return this.healthService.check();
  }
}
