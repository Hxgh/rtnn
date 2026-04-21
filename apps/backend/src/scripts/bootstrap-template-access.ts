import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { TEMPLATE_ACCESS_DEFAULTS } from '@rtnn/config/template-access';
import { PasswordService } from '../modules/auth/password.service';
import { bootstrapTemplateAccess } from '../support/bootstrap-template-access';

async function main() {
  const prisma = new PrismaClient();
  const passwordService = new PasswordService();
  const skipAdmin = process.env.BOOTSTRAP_TEMPLATE_ACCESS_SKIP_ADMIN === 'true';
  const skipCustomer =
    process.env.BOOTSTRAP_TEMPLATE_ACCESS_SKIP_CUSTOMER === 'true';

  try {
    const result = await bootstrapTemplateAccess({
      prisma,
      passwordService,
      skipAdmin,
      skipCustomer,
    });

    console.log(
      JSON.stringify(
        {
          tenant: result.defaultTenant.slug,
          permissionCount: result.permissions.length,
          admin: skipAdmin ? null : TEMPLATE_ACCESS_DEFAULTS.admin.email,
          customer: skipCustomer ? null : TEMPLATE_ACCESS_DEFAULTS.customer.email,
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
