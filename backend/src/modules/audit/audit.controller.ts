import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions.const';
import { RequirePermission } from '../../common/guards/require-permission.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditService } from './audit.service';

@ApiTags('admin-audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  @RequirePermission(PERMISSIONS.adminAuditLogsView)
  list(@Query() query: AuditLogQueryDto) {
    return this.auditService.list(query);
  }
}
