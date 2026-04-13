import { Injectable } from '@nestjs/common';
import type { DashboardStats } from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalAdminUsers,
      totalCustomers,
      totalRoles,
      blockedCustomers,
      recentAuditCount,
    ] = await Promise.all([
      this.prisma.adminProfile.count(),
      this.prisma.customerProfile.count(),
      this.prisma.role.count(),
      this.prisma.customerProfile.count({ where: { status: 'blocked' } }),
      this.prisma.auditLog.count(),
    ]);

    return {
      totalAdminUsers,
      totalCustomers,
      totalRoles,
      suspendedCustomers: blockedCustomers,
      recentAuditCount,
    };
  }
}
