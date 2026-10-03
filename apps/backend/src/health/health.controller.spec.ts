import type { TestingModule } from '@nestjs/testing';

import { ServiceUnavailableException } from '@nestjs/common';
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';
import { HealthController } from './health.controller.js';
import { DatabaseHealthIndicator } from './indicators/database.health.js';
import { RedisHealthIndicator } from './indicators/redis.health.js';

describe('HealthController', () => {
  const prisma = { ping: vi.fn<() => Promise<void>>() };
  const redis = { ping: vi.fn<() => Promise<void>>() };
  let controller: HealthController;

  beforeEach(async () => {
    prisma.ping.mockResolvedValue(undefined);
    redis.ping.mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [
        HealthIndicatorService,
        DatabaseHealthIndicator,
        RedisHealthIndicator,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports liveness without touching dependencies', () => {
    const result = controller.live();

    expect(result.status).toBe('ok');
    expect(prisma.ping).not.toHaveBeenCalled();
  });

  it('is ready when database and redis respond', async () => {
    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(result.details).toStrictEqual({ database: { status: 'up' }, redis: { status: 'up' } });
  });

  it('is not ready when redis is down', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
  });
});
