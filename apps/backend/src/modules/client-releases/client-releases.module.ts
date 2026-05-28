import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  ClientDownloadsController,
  ClientReleaseFactsController,
  ClientReleasesAdminController,
  ClientUpdatesController,
} from './client-releases.controller';
import { ClientReleaseDownloadResolver } from './client-release-download-resolver.service';
import { ClientReleaseFactsParser } from './client-release-facts-parser.service';
import { ClientReleaseMapper } from './client-release-mapper.service';
import { ClientReleasePolicyService } from './client-release-policy.service';
import { ClientReleaseQueryService } from './client-release-query.service';
import { ClientReleaseSyncService } from './client-release-sync.service';
import { ClientReleasesService } from './client-releases.service';

@Module({
  imports: [AuditModule],
  controllers: [
    ClientReleaseFactsController,
    ClientReleasesAdminController,
    ClientDownloadsController,
    ClientUpdatesController,
  ],
  providers: [
    ClientReleaseDownloadResolver,
    ClientReleaseFactsParser,
    ClientReleaseMapper,
    ClientReleasePolicyService,
    ClientReleaseQueryService,
    ClientReleaseSyncService,
    ClientReleasesService,
  ],
  exports: [ClientReleasesService],
})
export class ClientReleasesModule {}
