import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { AUDIT_ACTIONS } from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { apiBadRequest, apiNotFound } from '../../common/errors/api-error';
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
      throw apiNotFound('ADMIN_USER_NOT_FOUND', 'Admin user not found');
    }
    return this.toAdminUserDetail(account);
  }

  async createUser(actor: AuditActor, dto: CreateAdminUserDto) {
    const passwordHash = await this.passwordService.hash(dto.password);
    const roleIds = this.unique(dto.roleIds ?? []);
    await this.assertRolesExist(roleIds);

    const created = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
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

      await this.replaceAccountRoles(
        account.id,
        roleIds,
        account.tenantId,
        tx,
        {
          rolesVerified: true,
        },
      );

      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminUserCreate,
          resource: {
            type: 'admin-user',
            id: account.id,
            name: account.email,
          },
          detail: {
            email: account.email,
            roleIds,
            passwordChanged: true,
          },
        },
        tx,
      );

      return account;
    });

    return this.getUser(created.id);
  }

  async updateUser(actor: AuditActor, id: string, dto: UpdateAdminUserDto) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
      include: { adminProfile: true },
    });
    if (!existing || !existing.adminProfile) {
      throw apiNotFound('ADMIN_USER_NOT_FOUND', 'Admin user not found');
    }

    const displayName = dto.displayName ?? dto.name;
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
              }
            : {}),
          ...(dto.status ? { status: this.toAccountStatus(dto.status) } : {}),
        },
      });

      if (displayName) {
        await tx.adminProfile.update({
          where: { accountId: id },
          data: { name: displayName },
        });
      }

      if (dto.roleIds) {
        await this.replaceAccountRoles(id, dto.roleIds, existing.tenantId, tx);
      }

      if (passwordHash || dto.status || dto.roleIds) {
        await this.invalidateAdminSessions(id, tx);
      }

      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminUserUpdate,
          resource: {
            type: 'admin-user',
            id,
            name: existing.email,
          },
          detail: {
            changedFields,
            passwordChanged: Boolean(passwordHash),
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
      throw apiNotFound('ROLE_NOT_FOUND', 'Role not found');
    }
    return this.toRoleRecord(role);
  }

  async createRole(actor: AuditActor, dto: CreateRoleDto) {
    const permissionKeys = this.unique(dto.permissionKeys ?? []);
    const permissions = await this.findPermissionsByKeysOrThrow(permissionKeys);

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          slug: dto.slug ?? slugify(dto.name),
          name: dto.name,
          description: dto.description,
        },
      });

      await this.replaceRolePermissions(created.id, permissions, tx);

      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminRoleCreate,
          resource: {
            type: 'role',
            id: created.id,
            name: created.name,
          },
          detail: {
            slug: created.slug,
            permissionKeys,
          },
        },
        tx,
      );

      return created;
    });

    return this.getRole(role.id);
  }

  async updateRole(actor: AuditActor, id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw apiNotFound('ROLE_NOT_FOUND', 'Role not found');
    }

    const permissionKeys = dto.permissionKeys
      ? this.unique(dto.permissionKeys)
      : undefined;
    const permissions = permissionKeys
      ? await this.findPermissionsByKeysOrThrow(permissionKeys)
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.slug ? { slug: dto.slug } : {}),
        },
      });

      if (permissions) {
        await this.replaceRolePermissions(id, permissions, tx);
        await this.invalidateAdminSessionsForRole(id, tx);
      }

      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminRoleUpdate,
          resource: {
            type: 'role',
            id,
            name: dto.name ?? existing.name,
          },
          detail: {
            changedFields: [
              ...(dto.name ? ['name'] : []),
              ...(dto.description !== undefined ? ['description'] : []),
              ...(dto.slug ? ['slug'] : []),
              ...(dto.permissionKeys ? ['permissionKeys'] : []),
            ],
          },
        },
        tx,
      );
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
      throw apiNotFound('ROLE_NOT_FOUND', 'Role not found');
    }
    const permissionKeys = this.unique(dto.permissionKeys);
    const permissions = await this.findPermissionsByKeysOrThrow(permissionKeys);
    await this.prisma.$transaction(async (tx) => {
      await this.replaceRolePermissions(roleId, permissions, tx);
      await this.invalidateAdminSessionsForRole(roleId, tx);
      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminRolePermissionsUpdate,
          resource: {
            type: 'role',
            id: roleId,
            name: role.name,
          },
          detail: {
            permissionKeys,
          },
        },
        tx,
      );
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
      throw apiNotFound('ADMIN_USER_NOT_FOUND', 'Admin user not found');
    }
    const roleIds = await this.resolveRoleIdsOrThrow(dto);
    await this.prisma.$transaction(async (tx) => {
      await this.replaceAccountRoles(userId, roleIds, account.tenantId, tx);
      await this.invalidateAdminSessions(userId, tx);
      await this.auditWriter.write(
        {
          actor,
          action: AUDIT_ACTIONS.adminUserRolesUpdate,
          resource: {
            type: 'admin-user',
            id: userId,
            name: account.email,
          },
          detail: {
            roleIds,
          },
        },
        tx,
      );
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
    options: { rolesVerified?: boolean } = {},
  ) {
    const uniqueRoleIds = this.unique(roleIds);
    if (!options.rolesVerified) {
      await this.assertRolesExist(uniqueRoleIds, executor);
    }

    await executor.accountRole.deleteMany({
      where: {
        accountId,
        audience: 'admin',
      },
    });
    if (uniqueRoleIds.length === 0) {
      return;
    }

    await executor.accountRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({
        accountId,
        roleId,
        audience: 'admin',
        tenantId: tenantId ?? undefined,
      })),
    });
  }

  private unique(values: string[]): string[] {
    return Array.from(
      new Set(values.map((value) => value.trim()).filter(Boolean)),
    );
  }

  private async replaceRolePermissions(
    roleId: string,
    permissions: Array<{ id: string; key: string }>,
    executor: PrismaService | Prisma.TransactionClient,
  ) {
    await executor.rolePermission.deleteMany({
      where: { roleId },
    });
    if (permissions.length === 0) {
      return;
    }
    await executor.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    });
  }

  private async assertRolesExist(
    roleIds: string[],
    executor: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    const roles = await executor.role.findMany({
      where: {
        id: { in: roleIds },
      },
      select: { id: true },
    });
    const foundRoleIds = new Set(roles.map((role) => role.id));
    const missingRoleIds = roleIds.filter(
      (roleId) => !foundRoleIds.has(roleId),
    );
    if (missingRoleIds.length > 0) {
      throw apiBadRequest('ROLE_NOT_FOUND', 'Role not found', {
        roleIds: missingRoleIds,
      });
    }
  }

  private async resolveRoleIdsOrThrow(
    dto: BindUserRolesDto,
  ): Promise<string[]> {
    if (dto.roleIds) {
      return this.unique(dto.roleIds);
    }

    const roleSlugs = this.unique(dto.roleSlugs ?? []);
    if (roleSlugs.length === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs } },
      select: { id: true, slug: true },
    });
    const foundSlugs = new Set(roles.map((role) => role.slug));
    const missingSlugs = roleSlugs.filter((slug) => !foundSlugs.has(slug));
    if (missingSlugs.length > 0) {
      throw apiBadRequest('ROLE_NOT_FOUND', 'Role not found', {
        roleSlugs: missingSlugs,
      });
    }
    return roles.map((role) => role.id);
  }

  private async findPermissionsByKeysOrThrow(permissionKeys: string[]) {
    if (permissionKeys.length === 0) {
      return [];
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        key: { in: permissionKeys },
      },
      select: { id: true, key: true },
    });
    const foundKeys = new Set(permissions.map((permission) => permission.key));
    const missingPermissionKeys = permissionKeys.filter(
      (permissionKey) => !foundKeys.has(permissionKey),
    );
    if (missingPermissionKeys.length > 0) {
      throw apiBadRequest('PERMISSION_NOT_FOUND', 'Permission not found', {
        permissionKeys: missingPermissionKeys,
      });
    }
    return permissions;
  }

  private async invalidateAdminSessions(
    accountId: string,
    executor: PrismaService | Prisma.TransactionClient,
  ) {
    await executor.account.update({
      where: { id: accountId },
      data: {
        credentialsVersion: {
          increment: 1,
        },
      },
    });
    await executor.refreshSession.updateMany({
      where: {
        accountId,
        audience: 'admin',
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async invalidateAdminSessionsForRole(
    roleId: string,
    executor: PrismaService | Prisma.TransactionClient,
  ) {
    const accountRoles = await executor.accountRole.findMany({
      where: {
        roleId,
        audience: 'admin',
      },
      select: {
        accountId: true,
      },
    });
    const accountIds = this.unique(accountRoles.map((item) => item.accountId));
    if (accountIds.length === 0) {
      return;
    }

    await executor.account.updateMany({
      where: {
        id: { in: accountIds },
      },
      data: {
        credentialsVersion: {
          increment: 1,
        },
      },
    });
    await executor.refreshSession.updateMany({
      where: {
        accountId: { in: accountIds },
        audience: 'admin',
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private toAccountStatus(status?: string): AccountStatus {
    if (status === 'locked') {
      return AccountStatus.locked;
    }
    if (status === 'disabled') {
      return AccountStatus.disabled;
    }
    return AccountStatus.active;
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
