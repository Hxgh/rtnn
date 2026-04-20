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
import { PasswordService } from '../../src/modules/auth/password.service';
import { bootstrapTemplateAccess } from '../../src/support/bootstrap-template-access';

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
  const {
    defaultTenant,
    adminAccount,
    customerAccount,
  } = await bootstrapTemplateAccess({
    prisma,
    passwordService,
    adminFixture: TEST_FIXTURES.admin,
    customerFixture: TEST_FIXTURES.customer,
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
