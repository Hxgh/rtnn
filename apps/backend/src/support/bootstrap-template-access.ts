import { TEMPLATE_DEFAULTS } from '@rtnn/config';
import { PrismaClient } from '@prisma/client';
import { PERMISSION_SEEDS } from '../common/constants/permissions.const';
import { PasswordService } from '../modules/auth/password.service';

type TemplateAccessFixture = {
  email: string;
  password: string;
  displayName: string;
};

type BootstrapTemplateAccessOptions = {
  prisma: PrismaClient;
  passwordService: PasswordService;
  adminFixture?: TemplateAccessFixture;
  customerFixture?: TemplateAccessFixture;
  skipAdmin?: boolean;
  skipCustomer?: boolean;
};

export async function bootstrapTemplateAccess({
  prisma,
  passwordService,
  adminFixture = TEMPLATE_DEFAULTS.admin,
  customerFixture = TEMPLATE_DEFAULTS.customer,
  skipAdmin = false,
  skipCustomer = false,
}: BootstrapTemplateAccessOptions) {
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
    },
  });

  for (const item of PERMISSION_SEEDS) {
    await prisma.permission.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        description: item.description,
      },
      create: item,
    });
  }

  const superAdminRole = await prisma.role.upsert({
    where: { slug: 'super-admin' },
    update: {
      name: 'Super Admin',
      tenantId: defaultTenant.id,
    },
    create: {
      slug: 'super-admin',
      name: 'Super Admin',
      description: 'Template super admin role',
      tenantId: defaultTenant.id,
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { slug: 'customer-default' },
    update: {
      name: 'Customer Default',
      tenantId: defaultTenant.id,
    },
    create: {
      slug: 'customer-default',
      name: 'Customer Default',
      description: 'Template customer role',
      tenantId: defaultTenant.id,
    },
  });

  const allPermissions = await prisma.permission.findMany({
    orderBy: {
      key: 'asc',
    },
  });

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const customerPermissions = allPermissions.filter(
    (item) =>
      item.key === 'customer:self:view' ||
      item.key === 'customer:self:update',
  );

  for (const permission of customerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: customerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: customerRole.id,
        permissionId: permission.id,
      },
    });
  }

  const adminAccount = skipAdmin
    ? null
    : await prisma.account.upsert({
        where: { email: adminFixture.email },
        update: {
          status: 'active',
          tenantId: defaultTenant.id,
          passwordHash: await passwordService.hash(adminFixture.password),
        },
        create: {
          email: adminFixture.email,
          passwordHash: await passwordService.hash(adminFixture.password),
          status: 'active',
          tenantId: defaultTenant.id,
          adminProfile: {
            create: {
              name: adminFixture.displayName,
              tenantId: defaultTenant.id,
            },
          },
        },
      });

  const customerAccount = skipCustomer
    ? null
    : await prisma.account.upsert({
        where: { email: customerFixture.email },
        update: {
          status: 'active',
          tenantId: defaultTenant.id,
          passwordHash: await passwordService.hash(customerFixture.password),
        },
        create: {
          email: customerFixture.email,
          passwordHash: await passwordService.hash(customerFixture.password),
          status: 'active',
          tenantId: defaultTenant.id,
          customerProfile: {
            create: {
              name: customerFixture.displayName,
              tenantId: defaultTenant.id,
              status: 'active',
            },
          },
        },
      });

  if (adminAccount) {
    await prisma.accountRole.upsert({
      where: {
        accountId_roleId_audience: {
          accountId: adminAccount.id,
          roleId: superAdminRole.id,
          audience: 'admin',
        },
      },
      update: {},
      create: {
        accountId: adminAccount.id,
        roleId: superAdminRole.id,
        audience: 'admin',
        tenantId: defaultTenant.id,
      },
    });
  }

  if (customerAccount) {
    await prisma.accountRole.upsert({
      where: {
        accountId_roleId_audience: {
          accountId: customerAccount.id,
          roleId: customerRole.id,
          audience: 'customer',
        },
      },
      update: {},
      create: {
        accountId: customerAccount.id,
        roleId: customerRole.id,
        audience: 'customer',
        tenantId: defaultTenant.id,
      },
    });
  }

  return {
    defaultTenant,
    superAdminRole,
    customerRole,
    adminAccount,
    customerAccount,
    permissions: allPermissions,
  };
}
