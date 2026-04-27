import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const appConfig = {
    nodeEnv: 'production',
    deployEnvironment: 'testing',
    deployVersion: 'main-bce88fb0a427',
    deploySourceSha: 'bce88fb0a4271ad8180059ab8fc23c0135c8d632',
    backendImage: 'ghcr.io/example/rtnn-backend:main-bce88fb0a427',
  };
  let service: HealthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: appConfig },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
    prisma.$queryRaw.mockReset();
  });

  it('returns runtime release metadata', () => {
    expect(service.getVersion()).toEqual({
      environment: 'testing',
      version: 'main-bce88fb0a427',
      sourceSha: 'bce88fb0a4271ad8180059ab8fc23c0135c8d632',
      backendImage: 'ghcr.io/example/rtnn-backend:main-bce88fb0a427',
      timestamp: expect.any(String),
    });
  });

  it('includes release metadata in liveness', () => {
    expect(service.getLiveness()).toMatchObject({
      status: 'ok',
      release: {
        environment: 'testing',
        version: 'main-bce88fb0a427',
        sourceSha: 'bce88fb0a4271ad8180059ab8fc23c0135c8d632',
        backendImage: 'ghcr.io/example/rtnn-backend:main-bce88fb0a427',
      },
    });
  });

  it('includes release metadata in readiness', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ready',
      database: 'up',
      release: {
        environment: 'testing',
        version: 'main-bce88fb0a427',
      },
    });
  });

  it('keeps release metadata in readiness failures', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    await expect(service.getReadiness()).rejects.toMatchObject({
      response: {
        status: 'not_ready',
        database: 'down',
        release: {
          environment: 'testing',
          version: 'main-bce88fb0a427',
        },
      },
    });
  });
});
