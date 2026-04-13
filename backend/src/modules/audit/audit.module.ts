import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditWriter } from './audit-writer.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditWriter],
  exports: [AuditService, AuditWriter],
})
export class AuditModule {}
