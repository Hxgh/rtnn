import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions.const';
import { RequirePermission } from '../../common/guards/require-permission.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  @RequirePermission(PERMISSIONS.adminDashboardView)
  getStats() {
    return this.dashboardService.getStats();
  }
}
