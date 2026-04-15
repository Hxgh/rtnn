import { Injectable } from '@nestjs/common';
import type { AuditLogItem, PaginatedResult } from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQueryDto): Promise<PaginatedResult<AuditLogItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const actorAudienceFilter =
      query.actorType === 'system'
        ? null
        : query.actorType
          ? query.actorType
          : undefined;
    const where = {
      ...(actorAudienceFilter !== undefined
        ? { actorAudience: actorAudienceFilter }
        : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.search
        ? {
            OR: [
              {
                action: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                resource: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const actorAccountIds = Array.from(
      new Set(
        rows
          .map((row) => row.actorAccountId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const actorAccounts =
      actorAccountIds.length > 0
        ? await this.prisma.account.findMany({
            where: {
              id: {
                in: actorAccountIds,
              },
            },
            select: {
              id: true,
              email: true,
              adminProfile: {
                select: {
                  name: true,
                },
              },
              customerProfile: {
                select: {
                  name: true,
                },
              },
            },
          })
        : [];
    const actorAccountMap = new Map(
      actorAccounts.map((account) => [account.id, account]),
    );

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        actorType: row.actorAudience ?? 'system',
        actorId: row.actorAccountId,
        actorName: this.resolveActorName(row, actorAccountMap),
        resourceType: row.resource,
        resourceId: row.resourceId,
        detail: this.normalizeDetail(row.detail),
        createdAt: row.createdAt.toISOString(),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private resolveActorName(
    row: {
      actorAccountId: string | null;
      actorAudience: 'admin' | 'customer' | null;
      actorName: string | null;
    },
    actorAccountMap: Map<
      string,
      {
        email: string;
        adminProfile: { name: string } | null;
        customerProfile: { name: string } | null;
      }
    >,
  ): string {
    if (row.actorName) {
      return row.actorName;
    }
    if (!row.actorAccountId) {
      return 'system';
    }

    const actorAccount = actorAccountMap.get(row.actorAccountId);
    if (!actorAccount) {
      return row.actorAccountId;
    }

    if (row.actorAudience === 'admin') {
      return actorAccount.adminProfile?.name ?? actorAccount.email;
    }
    if (row.actorAudience === 'customer') {
      return actorAccount.customerProfile?.name ?? actorAccount.email;
    }
    return actorAccount.email;
  }

  private normalizeDetail(
    detail: unknown,
  ): Record<string, unknown> | null | undefined {
    if (!detail) {
      return null;
    }
    if (typeof detail === 'object' && !Array.isArray(detail)) {
      return detail as Record<string, unknown>;
    }
    return {
      value: detail,
    };
  }
}
