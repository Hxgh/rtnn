import 'dotenv/config';
import { randomUUID, scryptSync } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { TEMPLATE_DEFAULTS } from '@rtnn/config';
import { PERMISSION_SEEDS } from '../src/common/constants/permissions.const';

const prisma = new PrismaClient();
const defaultAdmin = TEMPLATE_DEFAULTS.admin;
const defaultCustomer = TEMPLATE_DEFAULTS.customer;

function hashPassword(raw: string): string {
  const salt = randomUUID().replace(/-/g, '');
  const hash = scryptSync(raw, salt, 64).toString('hex');
  return `${salt}.${hash}`;
}

async function main() {
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
      update: { name: item.name, description: item.description },
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

  const allPermissions = await prisma.permission.findMany();
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

  const customerReadPermissions = allPermissions.filter(
    (item) =>
      item.key === 'customer:self:view' ||
      item.key === 'customer:self:update',
  );
  for (const permission of customerReadPermissions) {
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

  const adminAccount = await prisma.account.upsert({
    where: { email: defaultAdmin.email },
    update: {
      status: 'active',
      tenantId: defaultTenant.id,
      passwordHash: hashPassword(defaultAdmin.password),
    },
    create: {
      email: defaultAdmin.email,
      passwordHash: hashPassword(defaultAdmin.password),
      status: 'active',
      tenantId: defaultTenant.id,
      adminProfile: {
        create: {
          name: defaultAdmin.displayName,
          tenantId: defaultTenant.id,
        },
      },
    },
  });

  const customerAccount = await prisma.account.upsert({
    where: { email: defaultCustomer.email },
    update: {
      status: 'active',
      tenantId: defaultTenant.id,
      passwordHash: hashPassword(defaultCustomer.password),
    },
    create: {
      email: defaultCustomer.email,
      passwordHash: hashPassword(defaultCustomer.password),
      status: 'active',
      tenantId: defaultTenant.id,
      customerProfile: {
        create: {
          name: defaultCustomer.displayName,
          tenantId: defaultTenant.id,
          status: 'active',
        },
      },
    },
  });

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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
