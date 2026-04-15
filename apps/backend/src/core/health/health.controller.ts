import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('healthz')
  @ApiOperation({ summary: 'Liveness probe' })
  healthz() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readyz')
  @ApiOperation({ summary: 'Readiness probe' })
  readyz() {
    return this.healthService.getReadiness();
  }
}
