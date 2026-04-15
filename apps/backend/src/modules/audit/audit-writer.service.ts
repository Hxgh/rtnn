import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriteInput } from './audit.types';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(
    input: AuditWriteInput,
    executor?: PrismaExecutor,
  ): Promise<void> {
    const client = executor ?? this.prisma;

    await client.auditLog.create({
      data: {
        tenantId: input.actor.tenantId ?? undefined,
        actorAccountId: input.actor.accountId,
        actorAudience: input.actor.type === 'system' ? null : input.actor.type,
        actorName: input.actor.name,
        action: input.action,
        resource: input.resource.type,
        resourceId: input.resource.id ?? undefined,
        ...(input.detail !== undefined ? { detail: input.detail } : {}),
      },
    });
  }
}
