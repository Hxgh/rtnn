import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request, {
  type SuperTest,
  type Test as SupertestRequest,
} from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  configureHttpApplication,
  type ConfigureHttpApplicationOptions,
} from '../../src/core/bootstrap/configure-http-application';
import { PERMISSION_SEEDS } from '../../src/common/constants/permissions.const';
import { PasswordService } from '../../src/modules/auth/password.service';

const BACKEND_ROOT = resolve(__dirname, '../..');

export const TEST_FIXTURES = {
  admin: {
    email: 'admin@rtnn.local',
    password: 'Admin123!@#',
    displayName: 'Template Admin',
  },
  limitedAdmin: {
    email: 'limited-admin@rtnn.local',
    password: 'Admin123!@#',
    displayName: 'Limited Admin',
  },
  customer: {
    email: 'customer@rtnn.local',
    password: 'Customer123!@#',
    displayName: 'Template Customer',
  },
} as const;

function withSchema(databaseUrl: string, schema: string) {
  const nextUrl = new URL(databaseUrl);
  nextUrl.searchParams.set('schema', schema);
  return nextUrl.toString();
}

function getBaseDatabaseUrl() {
  return process.env.TEST_BASE_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
}

function getTestDatabaseUrl() {
  return process.env.DATABASE_URL ?? '';
}

function getTestSchema() {
  return process.env.TEST_DATABASE_SCHEMA ?? 'backend_template_test';
}

async function recreateTestSchema() {
  const adminPrisma = new PrismaClient({
    datasources: {
      db: {
        url: withSchema(getBaseDatabaseUrl(), 'public'),
      },
    },
  });
  const schema = getTestSchema();

  try {
    await adminPrisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
    );
    await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await adminPrisma.$disconnect();
  }

  execFileSync(
    'pnpm',
    [
      'exec',
      'prisma',
      'db',
      'push',
      '--schema',
      'prisma/schema.prisma',
      '--skip-generate',
    ],
    {
      cwd: BACKEND_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: getTestDatabaseUrl(),
      },
      stdio: 'pipe',
    },
  );
}

async function truncateAllTables(prisma: PrismaClient) {
  const schema = getTestSchema();
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = '${schema}'`,
  );
  if (tables.length === 0) {
    return;
  }

  const quotedTables = tables
    .map(({ tablename }) => `"${schema}"."${tablename}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`,
  );
}

async function seedBaseData(prisma: PrismaClient) {
  const passwordService = new PasswordService();
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Default Tenant',
      slug: 'default',
    },
  });

  await prisma.permission.createMany({
    data: PERMISSION_SEEDS,
  });

  const permissions = await prisma.permission.findMany({
    orderBy: {
      key: 'asc',
    },
  });
  const permissionMap = new Map(permissions.map((item) => [item.key, item]));

  const superAdminRole = await prisma.role.create({
    data: {
      slug: 'super-admin',
      name: 'Super Admin',
      description: 'Template super admin role',
      tenantId: defaultTenant.id,
    },
  });
  const customerRole = await prisma.role.create({
    data: {
      slug: 'customer-default',
      name: 'Customer Default',
      description: 'Template customer role',
      tenantId: defaultTenant.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: superAdminRole.id,
      permissionId: permission.id,
    })),
  });

  const customerPermissions = [
    permissionMap.get('customer:self:view'),
    permissionMap.get('customer:self:update'),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  await prisma.rolePermission.createMany({
    data: customerPermissions.map((permission) => ({
      roleId: customerRole.id,
      permissionId: permission.id,
    })),
  });

  const adminAccount = await prisma.account.create({
    data: {
      email: TEST_FIXTURES.admin.email,
      passwordHash: await passwordService.hash(TEST_FIXTURES.admin.password),
      status: 'active',
      tenantId: defaultTenant.id,
      adminProfile: {
        create: {
          name: TEST_FIXTURES.admin.displayName,
          tenantId: defaultTenant.id,
        },
      },
    },
  });

  const limitedAdminAccount = await prisma.account.create({
    data: {
      email: TEST_FIXTURES.limitedAdmin.email,
      passwordHash: await passwordService.hash(
        TEST_FIXTURES.limitedAdmin.password,
      ),
      status: 'active',
      tenantId: defaultTenant.id,
      adminProfile: {
        create: {
          name: TEST_FIXTURES.limitedAdmin.displayName,
          tenantId: defaultTenant.id,
        },
      },
    },
  });

  const customerAccount = await prisma.account.create({
    data: {
      email: TEST_FIXTURES.customer.email,
      passwordHash: await passwordService.hash(TEST_FIXTURES.customer.password),
      status: 'active',
      tenantId: defaultTenant.id,
      customerProfile: {
        create: {
          name: TEST_FIXTURES.customer.displayName,
          tenantId: defaultTenant.id,
          status: 'active',
        },
      },
    },
  });

  await prisma.accountRole.create({
    data: {
      accountId: adminAccount.id,
      roleId: superAdminRole.id,
      audience: 'admin',
      tenantId: defaultTenant.id,
    },
  });

  await prisma.accountRole.create({
    data: {
      accountId: customerAccount.id,
      roleId: customerRole.id,
      audience: 'customer',
      tenantId: defaultTenant.id,
    },
  });

  return {
    defaultTenant,
    adminAccount,
    limitedAdminAccount,
    customerAccount,
  };
}

async function configureTestApplication(app: INestApplication) {
  const { appConfig, openApiDocument } = configureHttpApplication(app, {
    useAppLogger: false,
    enableRequestLogging: false,
    muteLoggerOutput: true,
  } satisfies ConfigureHttpApplicationOptions);
  await app.init();
  return {
    appConfig,
    openApiDocument,
  };
}

export class BackendTestHarness {
  private prisma!: PrismaClient;
  private app!: INestApplication;
  private moduleRef!: TestingModule;

  async init() {
    await recreateTestSchema();
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
    });
    this.moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    this.app = this.moduleRef.createNestApplication();
    await configureTestApplication(this.app);
  }

  async reset() {
    await truncateAllTables(this.prisma);
    await seedBaseData(this.prisma);
  }

  get prismaClient() {
    return this.prisma;
  }

  get http() {
    return request(this.app.getHttpServer()) as SuperTest<SupertestRequest>;
  }

  async close() {
    if (this.app) {
      await this.app.close();
    }
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  loginAdmin(
    email = TEST_FIXTURES.admin.email,
    password = TEST_FIXTURES.admin.password,
  ) {
    return this.http.post('/api/v1/auth/admin/login').send({
      email,
      password,
    });
  }

  loginCustomer(
    email = TEST_FIXTURES.customer.email,
    password = TEST_FIXTURES.customer.password,
  ) {
    return this.http.post('/api/v1/auth/customer/login').send({
      email,
      password,
    });
  }
}
