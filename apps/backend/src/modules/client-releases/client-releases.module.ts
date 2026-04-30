import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  ClientDownloadsController,
  ClientReleaseFactsController,
  ClientReleasesAdminController,
} from './client-releases.controller';
import { ClientReleasesService } from './client-releases.service';

@Module({
  imports: [AuditModule],
  controllers: [
    ClientReleaseFactsController,
    ClientReleasesAdminController,
    ClientDownloadsController,
  ],
  providers: [ClientReleasesService],
  exports: [ClientReleasesService],
})
export class ClientReleasesModule {}
