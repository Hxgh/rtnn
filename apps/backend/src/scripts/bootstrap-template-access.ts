import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { TEMPLATE_DEFAULTS } from '@rtnn/config';
import { PasswordService } from '../modules/auth/password.service';
import { bootstrapTemplateAccess } from '../support/bootstrap-template-access';

async function main() {
  const prisma = new PrismaClient();
  const passwordService = new PasswordService();

  try {
    const result = await bootstrapTemplateAccess({
      prisma,
      passwordService,
    });

    console.log(
      JSON.stringify(
        {
          tenant: result.defaultTenant.slug,
          permissionCount: result.permissions.length,
          admin: TEMPLATE_DEFAULTS.admin.email,
          customer: TEMPLATE_DEFAULTS.customer.email,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
