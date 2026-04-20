import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../src/modules/auth/password.service';
import { bootstrapTemplateAccess } from '../src/support/bootstrap-template-access';

const prisma = new PrismaClient();

async function main() {
  await bootstrapTemplateAccess({
    prisma,
    passwordService: new PasswordService(),
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
