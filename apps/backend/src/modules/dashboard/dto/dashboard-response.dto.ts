import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 3 })
  totalAdminUsers: number;

  @ApiProperty({ example: 24 })
  totalCustomers: number;

  @ApiProperty({ example: 5 })
  totalRoles: number;

  @ApiProperty({ example: 1 })
  suspendedCustomers: number;

  @ApiProperty({ example: 42 })
  recentAuditCount: number;
}
