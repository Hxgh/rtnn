import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import {
  LivenessResponseDto,
  ReadinessResponseDto,
  VersionResponseDto,
} from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('healthz')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ type: LivenessResponseDto })
  healthz() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readyz')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  readyz() {
    return this.healthService.getReadiness();
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Runtime release metadata' })
  @ApiOkResponse({ type: VersionResponseDto })
  version() {
    return this.healthService.getVersion();
  }
}
