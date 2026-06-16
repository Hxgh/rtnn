import { Injectable } from '@nestjs/common';
import type {
  AuditCategory,
  AuditLogItem,
  AuditOutcome,
  PaginatedResult,
} from '@rtnn/shared-types';
import { Prisma } from '@prisma/client';
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
    const where: Prisma.AuditLogWhereInput = {
      ...(actorAudienceFilter !== undefined
        ? { actorAudience: actorAudienceFilter }
        : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.outcome ? { outcome: query.outcome } : {}),
      ...(query.resourceType ? { resource: query.resourceType } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
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
              {
                resourceId: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                resourceName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                requestId: {
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
        category: (row.category ?? 'system') as AuditCategory,
        outcome: (row.outcome ?? 'success') as AuditOutcome,
        actorType: row.actorAudience ?? 'system',
        actorId: row.actorAccountId,
        actorName: this.resolveActorName(row, actorAccountMap),
        resourceType: row.resource,
        resourceId: row.resourceId,
        resourceName: row.resourceName,
        requestId: row.requestId,
        detail: this.normalizeDetail(row.detail),
        schemaVersion: row.schemaVersion ?? 1,
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
