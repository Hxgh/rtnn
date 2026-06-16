import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUDIT_ACTION_DEFINITIONS,
  AUDIT_RESOURCE_TYPES,
} from '@rtnn/shared-types';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriteInput } from './audit.types';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
const auditActionDefinitionByAction = new Map(
  AUDIT_ACTION_DEFINITIONS.map((definition) => [definition.action, definition]),
);
const auditResourceTypes = new Set<string>(AUDIT_RESOURCE_TYPES);
const sensitiveKeyPattern =
  /password|token|secret|authorization|cookie|connectionstring/i;
const passwordKeyPattern = /password/i;
const maxUserAgentLength = 512;

@Injectable()
export class AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(
    input: AuditWriteInput,
    executor?: PrismaExecutor,
  ): Promise<void> {
    const client = executor ?? this.prisma;
    const definition = auditActionDefinitionByAction.get(input.action);
    if (!definition) {
      throw new Error(`Unregistered audit action: ${input.action}`);
    }
    if (!auditResourceTypes.has(input.resource.type)) {
      throw new Error(
        `Unregistered audit resource type: ${input.resource.type}`,
      );
    }
    if (definition.defaultResourceType !== input.resource.type) {
      throw new Error(
        `Audit action ${input.action} expects resource ${definition.defaultResourceType}, got ${input.resource.type}`,
      );
    }
    const detail =
      input.detail === undefined
        ? undefined
        : (sanitizeAuditDetail(input.detail) as Prisma.InputJsonValue);

    await client.auditLog.create({
      data: {
        tenantId: input.actor.tenantId ?? undefined,
        actorAccountId: input.actor.accountId,
        actorAudience: input.actor.type === 'system' ? null : input.actor.type,
        actorName: input.actor.name,
        action: input.action,
        category: definition.category,
        outcome: input.outcome ?? 'success',
        resource: input.resource.type,
        resourceId: input.resource.id ?? undefined,
        resourceName: input.resource.name ?? undefined,
        requestId: input.context?.requestId ?? undefined,
        ipHash: hashIp(input.context?.ip),
        userAgent: truncateUserAgent(input.context?.userAgent),
        schemaVersion: 1,
        ...(detail !== undefined ? { detail } : {}),
      },
    });
  }
}

function sanitizeAuditDetail(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditDetail(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (nestedValue === undefined) {
      continue;
    }
    if (key === 'passwordChanged') {
      sanitized[key] = Boolean(nestedValue);
      continue;
    }
    if (passwordKeyPattern.test(key)) {
      sanitized[key] = true;
      continue;
    }
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = '[redacted]';
      continue;
    }
    sanitized[key] = sanitizeAuditDetail(nestedValue);
  }
  return sanitized;
}

function hashIp(ip: string | null | undefined): string | undefined {
  const normalized = ip?.trim();
  if (!normalized) {
    return undefined;
  }
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

function truncateUserAgent(userAgent: string | null | undefined) {
  const normalized = userAgent?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, maxUserAgentLength);
}
