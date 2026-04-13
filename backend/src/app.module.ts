import { Module } from '@nestjs/common';
import { CoreConfigModule } from './core/config/core-config.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './core/health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { IamModule } from './modules/iam/iam.module';

@Module({
  imports: [
    CoreConfigModule,
    LoggerModule,
    PrismaModule,
    HealthModule,
    DashboardModule,
    AuthModule,
    IamModule,
    CustomersModule,
    AuditModule,
  ],
})
export class AppModule {}
