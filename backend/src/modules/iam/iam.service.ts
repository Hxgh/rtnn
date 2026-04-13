import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import { PasswordService } from '../auth/password.service';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { BindUserRolesDto } from './dto/bind-user-roles.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

@Injectable()
export class IamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditWriter: AuditWriter,
  ) {}

  async listUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      adminProfile: { isNot: null },
      ...(query.search
        ? {
            OR: [
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                adminProfile: {
                  is: {
                    name: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        include: {
          adminProfile: true,
          roles: {
            where: { audience: 'admin' },
            include: { role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.toAdminUserSummary(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getUser(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        adminProfile: true,
        customerProfile: true,
        roles: {
          include: {
            role: {
              include: {
                permissionLinks: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
    if (!account) {
      throw new NotFoundException('Admin user not found');
    }
    return this.toAdminUserDetail(account);
  }

  async createUser(actor: AuditActor, dto: CreateAdminUserDto) {
    const passwordHash = await this.passwordService.hash(dto.password);
    const created = await this.prisma.account.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        status: this.toAccountStatus(dto.status),
        tenantId: dto.tenantId,
        adminProfile: {
          create: {
            name: dto.displayName ?? dto.name ?? dto.email.toLowerCase(),
            tenantId: dto.tenantId,
          },
        },
      },
      include: {
        adminProfile: true,
      },
    });

    if (dto.roleIds?.length) {
      await this.replaceAccountRoles(created.id, dto.roleIds, created.tenantId);
    }

    await this.auditWriter.write({
      actor,
      action: 'admin.user.create',
      resource: {
        type: 'admin-user',
        id: created.id,
      },
      detail: {
        email: created.email,
        roleIds: dto.roleIds ?? [],
      },
    });

    return this.getUser(created.id);
  }

  async updateUser(actor: AuditActor, id: string, dto: UpdateAdminUserDto) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
      include: { adminProfile: true },
    });
    if (!existing || !existing.adminProfile) {
      throw new NotFoundException('Admin user not found');
    }

    const displayName = dto.displayName ?? dto.name;
    const now = new Date();
    const changedFields = [
      ...(displayName ? ['displayName'] : []),
      ...(dto.password ? ['password'] : []),
      ...(dto.status ? ['status'] : []),
      ...(dto.roleIds ? ['roleIds'] : []),
    ];

    await this.prisma.$transaction(async (tx) => {
      const passwordHash = dto.password
        ? await this.passwordService.hash(dto.password)
        : undefined;

      await tx.account.update({
        where: { id },
        data: {
          ...(passwordHash
            ? {
                passwordHash,
                credentialsVersion: {
                  increment: 1,
                },
              }
            : {}),
          ...(dto.status ? { status: this.toAccountStatus(dto.status) } : {}),
        },
      });

      if (passwordHash) {
        await tx.refreshSession.updateMany({
          where: {
            accountId: id,
            audience: 'admin',
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });
      }

      if (displayName) {
        await tx.adminProfile.update({
          where: { accountId: id },
          data: { name: displayName },
        });
      }

      if (dto.roleIds) {
        await this.replaceAccountRoles(id, dto.roleIds, existing.tenantId, tx);
      }

      await this.auditWriter.write(
        {
          actor,
          action: 'admin.user.update',
          resource: {
            type: 'admin-user',
            id,
          },
          detail: {
            changedFields,
          },
        },
        tx,
      );
    });

    return this.getUser(id);
  }

  async listRoles(query: PaginationQueryDto) {
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
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        include: {
          permissionLinks: {
            include: { permission: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.toRoleRecord(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissionLinks: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return this.toRoleRecord(role);
  }

  async createRole(actor: AuditActor, dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        slug: dto.slug ?? slugify(dto.name),
        name: dto.name,
        description: dto.description,
      },
    });
    if (dto.permissionKeys && dto.permissionKeys.length > 0) {
      await this.assignRolePermissions(actor, role.id, {
        permissionKeys: dto.permissionKeys,
      });
    }
    await this.auditWriter.write({
      actor,
      action: 'admin.role.create',
      resource: {
        type: 'role',
        id: role.id,
      },
      detail: {
        slug: role.slug,
        permissionKeys: dto.permissionKeys ?? [],
      },
    });
    return this.getRole(role.id);
  }

  async updateRole(actor: AuditActor, id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.slug ? { slug: dto.slug } : {}),
      },
    });

    if (dto.permissionKeys) {
      await this.assignRolePermissions(actor, id, {
        permissionKeys: dto.permissionKeys,
      });
    }

    await this.auditWriter.write({
      actor,
      action: 'admin.role.update',
      resource: {
        type: 'role',
        id,
      },
      detail: {
        changedFields: [
          ...(dto.name ? ['name'] : []),
          ...(dto.description !== undefined ? ['description'] : []),
          ...(dto.slug ? ['slug'] : []),
          ...(dto.permissionKeys ? ['permissionKeys'] : []),
        ],
      },
    });

    return this.getRole(id);
  }

  async assignRolePermissions(
    actor: AuditActor,
    roleId: string,
    dto: AssignRolePermissionsDto,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const permissions = await this.prisma.permission.findMany({
      where: {
        key: { in: dto.permissionKeys },
      },
    });
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });
    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
      });
    }
    await this.auditWriter.write({
      actor,
      action: 'admin.role.permissions.update',
      resource: {
        type: 'role',
        id: roleId,
      },
      detail: {
        permissionKeys: dto.permissionKeys,
      },
    });
    return this.getRole(roleId);
  }

  async bindUserRoles(
    actor: AuditActor,
    userId: string,
    dto: BindUserRolesDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: userId },
      include: { adminProfile: true },
    });
    if (!account || !account.adminProfile) {
      throw new NotFoundException('Admin user not found');
    }
    const roleIds =
      dto.roleIds ??
      (dto.roleSlugs?.length
        ? (
            await this.prisma.role.findMany({
              where: { slug: { in: dto.roleSlugs } },
              select: { id: true },
            })
          ).map((role) => role.id)
        : []);
    await this.replaceAccountRoles(userId, roleIds, account.tenantId);
    await this.auditWriter.write({
      actor,
      action: 'admin.user.roles.update',
      resource: {
        type: 'admin-user',
        id: userId,
      },
      detail: {
        roleIds,
      },
    });
    return this.getUser(userId);
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
  }

  private async replaceAccountRoles(
    accountId: string,
    roleIds: string[],
    tenantId: string | null,
    executor: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    await executor.accountRole.deleteMany({
      where: {
        accountId,
        audience: 'admin',
      },
    });
    if (roleIds.length === 0) {
      return;
    }

    await executor.accountRole.createMany({
      data: roleIds.map((roleId) => ({
        accountId,
        roleId,
        audience: 'admin',
        tenantId: tenantId ?? undefined,
      })),
    });
  }

  private toAccountStatus(status?: string): AccountStatus {
    if (status === 'active') {
      return AccountStatus.active;
    }
    if (status === 'locked') {
      return AccountStatus.locked;
    }
    return AccountStatus.disabled;
  }

  private fromAccountStatus(status: AccountStatus) {
    if (status === AccountStatus.active) {
      return 'active';
    }
    if (status === AccountStatus.locked) {
      return 'locked';
    }
    return 'disabled';
  }

  private toAdminUserSummary(account: {
    id: string;
    email: string;
    status: AccountStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    adminProfile: { name: string } | null;
    roles: Array<{ role: { id: string; name: string } }>;
  }) {
    return {
      id: account.id,
      email: account.email,
      name: account.adminProfile?.name ?? account.email.split('@')[0],
      status: this.fromAccountStatus(account.status),
      roles: account.roles.map((item) => item.role.name),
      roleIds: account.roles.map((item) => item.role.id),
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private toAdminUserDetail(account: {
    id: string;
    email: string;
    status: AccountStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    adminProfile: { name: string } | null;
    roles: Array<{
      role: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        permissionLinks: Array<{ permission: { key: string } }>;
      };
    }>;
  }) {
    const permissions = Array.from(
      new Set(
        account.roles.flatMap((item) =>
          item.role.permissionLinks.map((link) => link.permission.key),
        ),
      ),
    );

    return {
      ...this.toAdminUserSummary(account),
      permissions,
      rolesDetailed: account.roles.map((item) => ({
        id: item.role.id,
        name: item.role.name,
        description: item.role.description,
        permissions: item.role.permissionLinks.map(
          (link) => link.permission.key,
        ),
        createdAt: item.role.createdAt.toISOString(),
        updatedAt: item.role.updatedAt.toISOString(),
      })),
    };
  }

  private toRoleRecord(role: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    permissionLinks: Array<{ permission: { key: string } }>;
  }) {
    const permissions = role.permissionLinks.map((link) => link.permission.key);
    return {
      id: role.id,
      slug: role.slug,
      code: role.slug,
      name: role.name,
      description: role.description,
      permissions,
      permissionKeys: permissions,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
