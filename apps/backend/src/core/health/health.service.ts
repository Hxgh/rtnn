import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseInfoDto } from './dto/release-info.dto';
import {
  LivenessResponseDto,
  ReadinessResponseDto,
  VersionResponseDto,
} from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  getVersion(): VersionResponseDto {
    return {
      ...this.getReleaseInfo(),
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness(): LivenessResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      release: this.getReleaseInfo(),
    };
  }

  async getReadiness(): Promise<ReadinessResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'up',
        timestamp: new Date().toISOString(),
        release: this.getReleaseInfo(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'down',
        timestamp: new Date().toISOString(),
        release: this.getReleaseInfo(),
      });
    }
  }

  private getReleaseInfo(): ReleaseInfoDto {
    return {
      environment: this.appConfig.deployEnvironment || this.appConfig.nodeEnv,
      version: this.appConfig.deployVersion || 'local',
      sourceSha: this.appConfig.deploySourceSha || 'unknown',
      backendImage: this.appConfig.backendImage || 'local',
    };
  }
}
