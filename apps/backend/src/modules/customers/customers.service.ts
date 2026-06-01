import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { apiBadRequest, apiNotFound } from '../../common/errors/api-error';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import { PasswordService } from '../auth/password.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { ResetCustomerPasswordDto } from './dto/reset-customer-password.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditWriter: AuditWriter,
  ) {}

  async list(query: ListCustomersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CustomerProfileWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                account: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(query.groupId
        ? { groups: { some: { groupId: query.groupId } } }
        : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customerProfile.count({ where }),
      this.prisma.customerProfile.findMany({
        where,
        include: {
          account: true,
          groups: { include: { group: true } },
          tags: { include: { tag: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      data: rows.map((row) => this.toCustomerSummary(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(id: string) {
    const found = await this.prisma.customerProfile.findUnique({
      where: { id },
      include: {
        account: true,
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!found) {
      throw apiNotFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    return this.toCustomerDetail(found);
  }

  async create(actor: AuditActor, dto: CreateCustomerDto) {
    const passwordHash = await this.passwordService.hash(dto.password);
    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          tenantId: dto.tenantId,
          customerProfile: {
            create: {
              name: dto.name,
              phone: dto.phone,
              tenantId: dto.tenantId,
            },
          },
        },
        include: {
          customerProfile: {
            include: {
              account: true,
              groups: { include: { group: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      });
      const customerProfile = created.customerProfile;
      if (!customerProfile) {
        throw apiNotFound(
          'CUSTOMER_PROFILE_NOT_CREATED',
          'Customer profile was not created',
        );
      }

      await this.replaceCustomerGroups(tx, customerProfile.id, dto.groupIds);
      await this.replaceCustomerTags(tx, customerProfile.id, dto.tagIds);

      await this.auditWriter.write(
        {
          actor,
          action: 'admin.customer.create',
          resource: {
            type: 'customer',
            id: customerProfile.id,
          },
          detail: {
            email: created.email,
            status: customerProfile.status,
            groupCount: dto.groupIds?.length ?? 0,
            tagCount: dto.tagIds?.length ?? 0,
          },
        },
        tx,
      );

      const detail = await tx.customerProfile.findUnique({
        where: { id: customerProfile.id },
        include: {
          account: true,
          groups: { include: { group: true } },
          tags: { include: { tag: true } },
        },
      });
      if (!detail) {
        throw apiNotFound(
          'CUSTOMER_PROFILE_NOT_FOUND',
          'Customer profile not found',
        );
      }
      return detail;
    });
    return this.toCustomerDetail(customer);
  }

  async update(actor: AuditActor, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!existing) {
      throw apiNotFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.password) {
        await this.updateCustomerPassword(tx, existing.accountId, dto.password);
      }

      await tx.customerProfile.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
        },
      });

      await this.replaceCustomerGroups(tx, id, dto.groupIds);
      await this.replaceCustomerTags(tx, id, dto.tagIds);

      await this.auditWriter.write(
        {
          actor,
          action: 'admin.customer.update',
          resource: {
            type: 'customer',
            id,
          },
          detail: {
            changedFields: [
              ...(dto.name ? ['name'] : []),
              ...(dto.phone !== undefined ? ['phone'] : []),
              ...(dto.password ? ['password'] : []),
              ...(dto.groupIds !== undefined ? ['groups'] : []),
              ...(dto.tagIds !== undefined ? ['tags'] : []),
            ],
          },
        },
        tx,
      );
    });

    return this.getById(id);
  }

  async updateStatus(
    actor: AuditActor,
    id: string,
    dto: UpdateCustomerStatusDto,
  ) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!existing) {
      throw apiNotFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    const profileStatus = this.normalizeCustomerStatus(dto.status);
    await this.prisma.$transaction(async (tx) => {
      await tx.customerProfile.update({
        where: { id },
        data: { status: profileStatus },
      });
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          status:
            profileStatus === 'blocked'
              ? 'locked'
              : profileStatus === 'inactive'
                ? 'disabled'
                : 'active',
        },
      });
      await this.auditWriter.write(
        {
          actor,
          action: 'admin.customer.status.update',
          resource: {
            type: 'customer',
            id,
          },
          detail: {
            status: profileStatus,
          },
        },
        tx,
      );
    });
    return this.getById(id);
  }

  async resetPassword(
    actor: AuditActor,
    id: string,
    dto: ResetCustomerPasswordDto,
  ) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      throw apiNotFound('CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.updateCustomerPassword(
        tx,
        existing.accountId,
        dto.nextPassword,
      );
      await this.auditWriter.write(
        {
          actor,
          action: 'admin.customer.password.reset',
          resource: {
            type: 'customer',
            id,
          },
        },
        tx,
      );
    });
    return { success: true };
  }

  async listGroups(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customerGroup.count({ where }),
      this.prisma.customerGroup.findMany({
        where,
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        memberCount: row._count.members,
        customerCount: row._count.members,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createGroup(actor: AuditActor, dto: CreateCustomerGroupDto) {
    const row = await this.prisma.customerGroup.create({
      data: {
        name: dto.name,
        slug: dto.slug ?? slugify(dto.name),
        description: dto.description,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
    await this.auditWriter.write({
      actor,
      action: 'admin.customer-group.create',
      resource: {
        type: 'customer-group',
        id: row.id,
      },
      detail: {
        name: row.name,
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: row._count.members,
      customerCount: row._count.members,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateGroup(
    actor: AuditActor,
    id: string,
    dto: UpdateCustomerGroupDto,
  ) {
    const row = await this.prisma.customerGroup.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
        description: dto.description,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
    await this.auditWriter.write({
      actor,
      action: 'admin.customer-group.update',
      resource: {
        type: 'customer-group',
        id,
      },
      detail: {
        changedFields: [
          ...(dto.name ? ['name'] : []),
          ...(dto.slug ? ['slug'] : []),
          ...(dto.description !== undefined ? ['description'] : []),
        ],
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      memberCount: row._count.members,
      customerCount: row._count.members,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listTags(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customerTag.count({ where }),
      this.prisma.customerTag.findMany({
        where,
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color ?? null,
        usageCount: row._count.members,
        customerCount: row._count.members,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createTag(actor: AuditActor, dto: CreateCustomerTagDto) {
    const row = await this.prisma.customerTag.create({
      data: {
        name: dto.name,
        slug: dto.slug ?? slugify(dto.name),
        color: dto.color,
        description: dto.description,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
    await this.auditWriter.write({
      actor,
      action: 'admin.customer-tag.create',
      resource: {
        type: 'customer-tag',
        id: row.id,
      },
      detail: {
        name: row.name,
      },
    });
    return {
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      usageCount: row._count.members,
      customerCount: row._count.members,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateTag(actor: AuditActor, id: string, dto: UpdateCustomerTagDto) {
    const row = await this.prisma.customerTag.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
        color: dto.color,
        description: dto.description,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
    await this.auditWriter.write({
      actor,
      action: 'admin.customer-tag.update',
      resource: {
        type: 'customer-tag',
        id,
      },
      detail: {
        changedFields: [
          ...(dto.name ? ['name'] : []),
          ...(dto.slug ? ['slug'] : []),
          ...(dto.color !== undefined ? ['color'] : []),
          ...(dto.description !== undefined ? ['description'] : []),
        ],
      },
    });
    return {
      id: row.id,
      name: row.name,
      color: row.color ?? null,
      usageCount: row._count.members,
      customerCount: row._count.members,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCustomerSummary(row: {
    id: string;
    accountId: string;
    name: string;
    phone: string | null;
    status: 'active' | 'inactive' | 'blocked';
    tenantId: string | null;
    createdAt: Date;
    updatedAt: Date;
    account: { email: string; lastLoginAt: Date | null };
    groups: Array<{ group: { id: string; name: string } }>;
    tags: Array<{ tag: { id: string; name: string } }>;
  }) {
    return {
      id: row.id,
      accountId: row.accountId,
      email: row.account.email,
      name: row.name,
      phone: row.phone ?? null,
      status: row.status,
      tenantId: row.tenantId,
      groups: row.groups.map((item) => ({
        id: item.group.id,
        name: item.group.name,
      })),
      groupNames: row.groups.map((item) => item.group.name),
      tags: row.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
      })),
      tagNames: row.tags.map((item) => item.tag.name),
      lastLoginAt: row.account.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCustomerDetail(
    row: Parameters<CustomersService['toCustomerSummary']>[0],
  ) {
    return {
      ...this.toCustomerSummary(row),
      notes: null,
    };
  }

  private normalizeCustomerStatus(
    status: UpdateCustomerStatusDto['status'],
  ): 'active' | 'inactive' | 'blocked' {
    return status;
  }

  private async updateCustomerPassword(
    executor: PrismaService | Prisma.TransactionClient,
    accountId: string,
    nextPassword: string,
  ) {
    const passwordHash = await this.passwordService.hash(nextPassword);
    const revokedAt = new Date();

    await executor.account.update({
      where: { id: accountId },
      data: {
        passwordHash,
        credentialsVersion: {
          increment: 1,
        },
      },
    });
    await executor.refreshSession.updateMany({
      where: {
        accountId,
        audience: 'customer',
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }

  private async replaceCustomerGroups(
    executor: Prisma.TransactionClient,
    customerId: string,
    groupIds?: string[],
  ) {
    if (groupIds === undefined) {
      return;
    }
    const uniqueGroupIds = [...new Set(groupIds.filter(Boolean))];
    await executor.customerGroupMember.deleteMany({
      where: { customerId },
    });
    if (uniqueGroupIds.length === 0) {
      return;
    }
    await this.ensureCustomerGroupsExist(executor, uniqueGroupIds);
    await executor.customerGroupMember.createMany({
      data: uniqueGroupIds.map((groupId) => ({
        customerId,
        groupId,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceCustomerTags(
    executor: Prisma.TransactionClient,
    customerId: string,
    tagIds?: string[],
  ) {
    if (tagIds === undefined) {
      return;
    }
    const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];
    await executor.customerTagMember.deleteMany({
      where: { customerId },
    });
    if (uniqueTagIds.length === 0) {
      return;
    }
    await this.ensureCustomerTagsExist(executor, uniqueTagIds);
    await executor.customerTagMember.createMany({
      data: uniqueTagIds.map((tagId) => ({
        customerId,
        tagId,
      })),
      skipDuplicates: true,
    });
  }

  private async ensureCustomerGroupsExist(
    executor: Prisma.TransactionClient,
    groupIds: string[],
  ) {
    const count = await executor.customerGroup.count({
      where: { id: { in: groupIds } },
    });
    if (count !== groupIds.length) {
      throw apiBadRequest(
        'CUSTOMER_GROUP_NOT_FOUND',
        'Customer group not found',
        {
          customerGroupIds: groupIds,
        },
      );
    }
  }

  private async ensureCustomerTagsExist(
    executor: Prisma.TransactionClient,
    tagIds: string[],
  ) {
    const count = await executor.customerTag.count({
      where: { id: { in: tagIds } },
    });
    if (count !== tagIds.length) {
      throw apiBadRequest('CUSTOMER_TAG_NOT_FOUND', 'Customer tag not found', {
        customerTagIds: tagIds,
      });
    }
  }
}
