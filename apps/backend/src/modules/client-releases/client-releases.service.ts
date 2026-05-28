import { Injectable } from '@nestjs/common';
import type {
  ClientDownloadInfo,
  ClientPackageListItem,
  ClientReleaseDetail,
  ClientReleaseSummary,
  ClientUpdateCheckInfo,
  ClientUpdatePolicySummary,
  PaginatedResult,
} from '@rtnn/shared-types';
import { AuditActor } from '../audit/audit.types';
import { ClientDownloadListQueryDto } from './dto/client-download-list-query.dto';
import { ClientDownloadQueryDto } from './dto/client-download-query.dto';
import { ClientPackageListQueryDto } from './dto/client-package-list-query.dto';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';
import { ClientReleaseListQueryDto } from './dto/client-release-list-query.dto';
import { UpdateClientReleasePolicyDto } from './dto/update-client-release-policy.dto';
import { ClientReleaseDownloadResolver } from './client-release-download-resolver.service';
import { ClientReleasePolicyService } from './client-release-policy.service';
import { ClientReleaseQueryService } from './client-release-query.service';
import { ClientReleaseSyncService } from './client-release-sync.service';

@Injectable()
export class ClientReleasesService {
  constructor(
    private readonly syncService: ClientReleaseSyncService,
    private readonly queryService: ClientReleaseQueryService,
    private readonly policyService: ClientReleasePolicyService,
    private readonly downloads: ClientReleaseDownloadResolver,
  ) {}

  async syncFacts(dto: ClientReleaseFactsDto): Promise<ClientReleaseDetail> {
    const releaseId = await this.syncService.syncFacts(dto);
    return this.detail(releaseId);
  }

  async list(
    query: ClientReleaseListQueryDto,
  ): Promise<PaginatedResult<ClientReleaseSummary>> {
    return this.queryService.list(query);
  }

  async listPackages(
    query: ClientPackageListQueryDto,
  ): Promise<PaginatedResult<ClientPackageListItem>> {
    return this.queryService.listPackages(query);
  }

  async detail(id: string): Promise<ClientReleaseDetail> {
    return this.queryService.detail(id);
  }

  async updatePolicy(
    actor: AuditActor,
    releaseId: string,
    policyId: string,
    dto: UpdateClientReleasePolicyDto,
  ): Promise<ClientUpdatePolicySummary> {
    return this.policyService.updatePolicy(actor, releaseId, policyId, dto);
  }

  async resolveDownload(
    query: ClientDownloadQueryDto,
  ): Promise<ClientDownloadInfo> {
    return this.downloads.resolveDownload(query);
  }

  async listDownloads(
    query: ClientDownloadListQueryDto,
  ): Promise<ClientDownloadInfo[]> {
    return this.downloads.listDownloads(query);
  }

  async checkUpdate(
    query: ClientDownloadQueryDto,
  ): Promise<ClientUpdateCheckInfo> {
    return this.downloads.checkUpdate(query);
  }
}
