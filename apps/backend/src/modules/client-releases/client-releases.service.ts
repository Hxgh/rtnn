import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ClientDownloadInfo,
  ClientDownloadListQuery,
  ClientPackageListItem,
  ClientPackageListQuery,
  ClientPackageSummary,
  ClientReleaseDetail,
  ClientReleaseSummary,
  ClientUpdateCheckInfo,
  ClientUpdatePolicySummary,
  PaginatedResult,
} from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import { ClientDownloadListQueryDto } from './dto/client-download-list-query.dto';
import { ClientDownloadQueryDto } from './dto/client-download-query.dto';
import { ClientPackageListQueryDto } from './dto/client-package-list-query.dto';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';
import { ClientReleaseListQueryDto } from './dto/client-release-list-query.dto';
import { UpdateClientReleasePolicyDto } from './dto/update-client-release-policy.dto';

type JsonRecord = Record<string, unknown>;

type PackageWithRelease = Prisma.ClientPackageGetPayload<{
  include: { release: true };
}>;

type ReleaseWithPackages = Prisma.ClientReleaseGetPayload<{
  include: { packages: true };
}>;

@Injectable()
export class ClientReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriter,
  ) {}

  async syncFacts(dto: ClientReleaseFactsDto) {
    if (dto.schemaVersion !== 'rtnn.deploy.client-release-facts.v1') {
      throw new BadRequestException(
        `Unsupported client release facts schema: ${dto.schemaVersion}`,
      );
    }

    const packages = this.readFactPackages(dto);
    if (packages.length === 0) {
      throw new BadRequestException(
        'Client release facts do not contain packages',
      );
    }

    const source = this.asRecord(dto.source);
    const sourceRepository = stringValue(source.repository, 'unknown');
    const sourceRunId = stringValue(source.runId, `unknown-${Date.now()}`);
    const sourceSha = stringValue(
      source.sourceSha,
      packages[0]?.sourceSha ?? 'unknown',
    );
    const sourceRefs = Array.isArray(source.sourceRefs)
      ? source.sourceRefs.map((item) => stringValue(item)).filter(Boolean)
      : [];
    const releaseVersion = packages[0].releaseVersion;
    const channel = stringValue(
      dto.environment,
      packages[0].channel || 'production',
    );
    const dryRun = Boolean(this.asRecord(dto.release).dryRun);
    const generatedAt = this.resolveGeneratedAt(packages);
    const status = this.resolveReleaseStatus(packages, dryRun);
    const distributionKeep = this.resolveDistributionKeep(dto);

    const release = await this.prisma.$transaction(async (tx) => {
      const row = await tx.clientRelease.upsert({
        where: {
          channel_sourceRepository_sourceRunId: {
            channel,
            sourceRepository,
            sourceRunId,
          },
        },
        create: {
          releaseVersion,
          channel,
          sourceRepository,
          sourceRunId,
          sourceSha,
          sourceRef: sourceRefs[0] ?? packages[0].sourceRef ?? null,
          dryRun,
          status,
          generatedAt,
          syncedAt: new Date(),
          rawFacts: dto as unknown as Prisma.InputJsonValue,
        },
        update: {
          releaseVersion,
          sourceSha,
          sourceRef: sourceRefs[0] ?? packages[0].sourceRef ?? null,
          dryRun,
          status,
          generatedAt,
          syncedAt: new Date(),
          rawFacts: dto as unknown as Prisma.InputJsonValue,
        },
      });

      for (const item of packages) {
        await tx.clientPackage.upsert({
          where: {
            releaseId_artifactName: {
              releaseId: row.id,
              artifactName: item.artifactName,
            },
          },
          create: {
            releaseId: row.id,
            ...this.toPackageWriteData(item),
          },
          update: this.toPackageWriteData(item),
        });

        await tx.clientUpdatePolicy.upsert({
          where: {
            client_target_channel: {
              client: item.client,
              target: item.target,
              channel: item.channel || channel,
            },
          },
          create: {
            client: item.client,
            target: item.target,
            channel: item.channel || channel,
          },
          update: {},
        });
      }

      await this.markPrunedDistributedPackages(
        tx,
        packages,
        channel,
        distributionKeep,
      );

      return row;
    });

    return this.detail(release.id);
  }

  async list(
    query: ClientReleaseListQueryDto,
  ): Promise<PaginatedResult<ClientReleaseSummary>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const packageFilter: Prisma.ClientPackageWhereInput = {
      ...(query.client ? { client: query.client } : {}),
      ...(query.target ? { target: query.target } : {}),
      ...(query.distributionStatus
        ? { distributionStatus: query.distributionStatus }
        : {}),
    };
    const hasPackageFilter = Object.keys(packageFilter).length > 0;
    const where: Prisma.ClientReleaseWhereInput = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(hasPackageFilter ? { packages: { some: packageFilter } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                releaseVersion: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { sourceSha: { contains: query.search, mode: 'insensitive' } },
              {
                packages: {
                  some: {
                    artifactName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.clientRelease.count({ where }),
      this.prisma.clientRelease.findMany({
        where,
        include: { packages: true },
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.toReleaseSummary(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async listPackages(
    query: ClientPackageListQueryDto,
  ): Promise<PaginatedResult<ClientPackageListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildPackageWhere(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.clientPackage.count({ where }),
      this.prisma.clientPackage.findMany({
        where,
        include: { release: true },
        orderBy: [
          { release: { generatedAt: 'desc' } },
          { release: { createdAt: 'desc' } },
          { client: 'asc' },
          { target: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((row) => this.toPackageListItem(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async detail(id: string): Promise<ClientReleaseDetail> {
    const release = await this.prisma.clientRelease.findUnique({
      where: { id },
      include: {
        packages: {
          orderBy: [{ client: 'asc' }, { target: 'asc' }],
        },
      },
    });
    if (!release) {
      throw new NotFoundException('Client release not found');
    }

    const policies = await this.prisma.clientUpdatePolicy.findMany({
      where: {
        OR: release.packages.map((item) => ({
          client: item.client,
          target: item.target,
          channel: release.channel,
        })),
      },
      orderBy: [{ client: 'asc' }, { target: 'asc' }],
    });
    const optionsByPolicyKey = await this.resolvePolicyOptions(policies);

    return {
      ...this.toReleaseSummary(release),
      packages: release.packages.map((item) => this.toPackageSummary(item)),
      policies: policies.map((policy) =>
        this.toPolicySummary(
          policy,
          optionsByPolicyKey.get(policyKey(policy)) ?? [],
        ),
      ),
    };
  }

  private async resolvePolicyOptions(
    policies: Prisma.ClientUpdatePolicyGetPayload<object>[],
  ) {
    if (policies.length === 0) {
      return new Map<string, ClientUpdatePolicySummary['releaseOptions']>();
    }

    const pairs = unique(policies.map((policy) => policyKey(policy)));
    const optionsByPolicyKey = new Map<
      string,
      ClientUpdatePolicySummary['releaseOptions']
    >();

    for (const pair of pairs) {
      const [client, target, channel] = pair.split('\u0000');
      const packageWhere = this.buildDownloadablePackageWhere(client, target);
      const releases = await this.prisma.clientRelease.findMany({
        where: {
          channel,
          dryRun: false,
          packages: {
            some: packageWhere,
          },
        },
        select: {
          id: true,
          releaseVersion: true,
          generatedAt: true,
          createdAt: true,
        },
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      });
      optionsByPolicyKey.set(
        `${client}\u0000${target}\u0000${channel}`,
        releases.map((release) => ({
          id: release.id,
          releaseVersion: release.releaseVersion,
          generatedAt: release.generatedAt?.toISOString() ?? null,
        })),
      );
    }

    return optionsByPolicyKey;
  }

  async updatePolicy(
    actor: AuditActor,
    releaseId: string,
    policyId: string,
    dto: UpdateClientReleasePolicyDto,
  ): Promise<ClientUpdatePolicySummary> {
    const [existing, release] = await this.prisma.$transaction([
      this.prisma.clientUpdatePolicy.findUnique({
        where: { id: policyId },
      }),
      this.prisma.clientRelease.findUnique({
        where: { id: releaseId },
        include: {
          packages: {
            select: {
              client: true,
              target: true,
            },
          },
        },
      }),
    ]);
    if (!existing || !release) {
      throw new NotFoundException('Client update policy not found');
    }
    const belongsToRelease =
      existing.channel === release.channel &&
      release.packages.some(
        (item) =>
          item.client === existing.client && item.target === existing.target,
      );
    if (!belongsToRelease) {
      throw new NotFoundException('Client update policy not found');
    }

    const recommendedReleaseId = normalizeNullableString(
      dto.recommendedReleaseId,
    );
    const nextAllowGithubFallback =
      dto.allowGithubFallback ?? existing.allowGithubFallback;
    if (recommendedReleaseId) {
      const candidate = await this.findPackageByReleaseId(
        recommendedReleaseId,
        existing.client,
        existing.target,
      );
      if (!candidate || candidate.release.channel !== existing.channel) {
        throw new BadRequestException(
          'Recommended release is not available for this client target channel',
        );
      }
      if (!this.resolvePackageDownloadUrl(candidate, nextAllowGithubFallback)) {
        throw new BadRequestException(
          'Recommended release does not have a downloadable package for this policy',
        );
      }
    }

    const policy = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.clientUpdatePolicy.update({
        where: { id: policyId },
        data: {
          enabled: dto.enabled,
          recommendedReleaseId,
          minimumSupportedVersion: normalizeNullableString(
            dto.minimumSupportedVersion,
          ),
          forceUpdate: dto.forceUpdate,
          allowGithubFallback: dto.allowGithubFallback,
          notes: normalizeNullableString(dto.notes),
        },
      });

      await this.auditWriter.write(
        {
          actor,
          action: 'admin.client-release-policy.update',
          resource: {
            type: 'client-release-policy',
            id: policyId,
          },
          detail: {
            client: updated.client,
            target: updated.target,
            channel: updated.channel,
          },
        },
        tx,
      );

      return updated;
    });

    const optionsByPolicyKey = await this.resolvePolicyOptions([policy]);

    return this.toPolicySummary(
      policy,
      optionsByPolicyKey.get(policyKey(policy)) ?? [],
    );
  }

  async resolveDownload(
    query: ClientDownloadQueryDto,
  ): Promise<ClientDownloadInfo> {
    const channel = query.channel || 'production';
    const policy = await this.prisma.clientUpdatePolicy.findUnique({
      where: {
        client_target_channel: {
          client: query.client,
          target: query.target,
          channel,
        },
      },
    });

    if (policy && !policy.enabled) {
      return {
        client: query.client,
        target: query.target,
        channel,
        downloadType: 'unavailable',
        updateAvailable: false,
        forceUpdate: false,
        reason: 'disabled',
      };
    }

    const allowGithubFallback = policy?.allowGithubFallback ?? true;
    const selected = policy?.recommendedReleaseId
      ? await this.findPackageByReleaseId(
          policy.recommendedReleaseId,
          query.client,
          query.target,
        )
      : await this.findLatestPackage(
          query.client,
          query.target,
          channel,
          allowGithubFallback,
        );
    if (!selected) {
      return {
        client: query.client,
        target: query.target,
        channel,
        downloadType: 'unavailable',
        updateAvailable: false,
        forceUpdate: false,
        reason: 'missing-package',
      };
    }

    const directUrl = this.resolvePackageDownloadUrl(
      selected,
      allowGithubFallback,
    );
    const provider = this.resolveDownloadProvider(selected, directUrl);
    const belowMinimum = this.isBelowMinimum(
      query.currentVersion,
      policy?.minimumSupportedVersion,
    );

    return {
      client: selected.client,
      target: selected.target,
      channel: selected.release.channel,
      version: selected.release.releaseVersion,
      shellVersion: selected.shellVersion,
      generatedAt: selected.release.generatedAt?.toISOString() ?? null,
      syncedAt:
        selected.syncedAt?.toISOString() ??
        selected.release.syncedAt?.toISOString() ??
        null,
      downloadType: directUrl ? 'direct' : 'unavailable',
      provider,
      downloadUrl: directUrl,
      sourceUrl: selected.sourceUrl,
      fileName: selected.fileName,
      fileSize: selected.fileSize,
      sha256: selected.sha256,
      updateAvailable: Boolean(
        query.currentVersion &&
        query.currentVersion !== selected.release.releaseVersion &&
        query.currentVersion !== selected.shellVersion,
      ),
      forceUpdate: Boolean(policy?.forceUpdate || belowMinimum),
      minimumSupportedVersion: policy?.minimumSupportedVersion ?? null,
      notes: policy?.notes ?? null,
      reason: this.resolveDownloadReason(
        selected,
        directUrl,
        allowGithubFallback,
      ),
    };
  }

  async listDownloads(
    query: ClientDownloadListQueryDto,
  ): Promise<ClientDownloadInfo[]> {
    const channel = query.channel || 'production';
    const rows = await this.prisma.clientPackage.findMany({
      where: this.buildDownloadPackageWhere({
        ...query,
        channel,
      }),
      select: {
        client: true,
        target: true,
      },
      orderBy: [{ client: 'asc' }, { target: 'asc' }],
    });
    const pairs = unique(
      rows.map((item) => `${item.client}\u0000${item.target}`),
    );
    const downloads = await Promise.all(
      pairs.map((pair) => {
        const [client, target] = pair.split('\u0000');
        return this.resolveDownload({ client, target, channel });
      }),
    );

    return downloads.filter(
      (item) =>
        item.downloadType !== 'unavailable' && Boolean(item.downloadUrl),
    );
  }

  async checkUpdate(
    query: ClientDownloadQueryDto,
  ): Promise<ClientUpdateCheckInfo> {
    return this.resolveDownload(query);
  }

  private async findPackageByReleaseId(
    releaseId: string,
    client: string,
    target: string,
  ): Promise<PackageWithRelease | null> {
    return this.prisma.clientPackage.findFirst({
      where: {
        releaseId,
        client,
        target,
        distributionStatus: { notIn: ['disabled', 'pruned'] },
      },
      include: { release: true },
    });
  }

  private async findLatestPackage(
    client: string,
    target: string,
    channel: string,
    allowGithubFallback = true,
  ): Promise<PackageWithRelease | null> {
    const releases = await this.prisma.clientRelease.findMany({
      where: {
        channel,
        dryRun: false,
        packages: {
          some: {
            client,
            target,
            distributionStatus: { notIn: ['disabled', 'pruned'] },
          },
        },
      },
      include: {
        packages: {
          where: {
            client,
            target,
            distributionStatus: { notIn: ['disabled', 'pruned'] },
          },
          take: 1,
        },
      },
      orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
    const candidates = releases.flatMap((release) =>
      release.packages.map((item) => ({ ...item, release })),
    );
    return (
      candidates.find((item) =>
        this.resolvePackageDownloadUrl(item, allowGithubFallback),
      ) ??
      candidates[0] ??
      null
    );
  }

  private buildPackageWhere(
    query: ClientPackageListQuery,
  ): Prisma.ClientPackageWhereInput {
    return {
      ...(query.client ? { client: query.client } : {}),
      ...(query.target ? { target: query.target } : {}),
      ...(query.distributionStatus
        ? { distributionStatus: query.distributionStatus }
        : {}),
      ...(query.channel ? { release: { channel: query.channel } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                artifactName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fileName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                sha256: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                release: {
                  releaseVersion: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                release: {
                  sourceSha: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildDownloadPackageWhere(
    query: ClientDownloadListQuery,
  ): Prisma.ClientPackageWhereInput {
    return {
      ...(query.client ? { client: query.client } : {}),
      ...(query.target ? { target: query.target } : {}),
      distributionStatus: { notIn: ['disabled', 'pruned'] },
      release: {
        channel: query.channel || 'production',
        dryRun: false,
      },
    };
  }

  private buildDownloadablePackageWhere(
    client: string,
    target: string,
  ): Prisma.ClientPackageWhereInput {
    return {
      client,
      target,
      distributionStatus: { notIn: ['disabled', 'pruned'] },
      OR: [
        {
          distributionStatus: 'synced',
          distributionUrl: { not: null },
        },
        {
          sourceUrl: { not: null },
        },
      ],
    };
  }

  private readFactPackages(dto: ClientReleaseFactsDto) {
    const items: Array<{
      client: string;
      target: string;
      shell: string;
      packageName?: string;
      artifactName: string;
      releaseVersion: string;
      shellVersion: string;
      channel: string;
      releaseKind: string;
      webUrl?: string;
      sourceSha: string;
      sourceRef?: string;
      generatedAt?: Date;
      rawFacts: JsonRecord;
      sourceUrl?: string;
      distributionProvider: string;
      distributionUrl?: string;
      distributionStatus: string;
      fileName?: string;
      fileSize?: number;
      sha256?: string;
      syncedAt?: Date;
      prunedAt?: Date;
      blockers: string[];
      signingStatus?: string;
      buildStatus?: string;
      updaterStatus?: string;
      updaterUrl?: string;
      storeProvider?: string;
      storeStatus?: string;
    }> = [];

    for (const [client, targetsValue] of Object.entries(dto.clients ?? {})) {
      const targets = this.asRecord(targetsValue);
      for (const [target, targetValue] of Object.entries(targets)) {
        const state = this.asRecord(targetValue);
        const distribution = this.asRecord(state.distribution);
        const desktop = this.asRecord(state.desktop);
        const mobile = this.asRecord(state.mobile);
        const updater = this.asRecord(state.updater);
        const storeRelease = this.asRecord(mobile.storeRelease);
        const blockers = [
          ...stringArray(desktop.blockers),
          ...stringArray(mobile.blockers),
          ...stringArray(distribution.blockers),
        ];

        items.push({
          client,
          target,
          shell: stringValue(state.shell, client),
          packageName: stringValue(state.packageName),
          artifactName: stringValue(state.artifactName, `${client}-${target}`),
          releaseVersion: stringValue(state.releaseVersion, 'unknown'),
          shellVersion: stringValue(state.shellVersion, '0.0.0'),
          channel: stringValue(state.channel, dto.environment),
          releaseKind: stringValue(state.releaseKind, 'unknown'),
          webUrl: stringValue(state.webUrl),
          sourceSha: stringValue(state.sourceSha),
          sourceRef: stringValue(state.sourceRef),
          generatedAt: dateValue(state.generatedAt),
          rawFacts: state,
          sourceUrl: stringValue(
            distribution.sourceUrl,
            stringValue(state.sourceUrl),
          ),
          distributionProvider: stringValue(
            distribution.provider,
            stringValue(state.distributionProvider, 'github-release'),
          ),
          distributionUrl: stringValue(
            distribution.url,
            stringValue(state.distributionUrl),
          ),
          distributionStatus: stringValue(
            distribution.status,
            stringValue(state.distributionStatus, 'pending'),
          ),
          fileName: stringValue(
            distribution.fileName,
            stringValue(state.fileName),
          ),
          fileSize: numberValue(distribution.fileSize ?? state.fileSize),
          sha256: stringValue(distribution.sha256, stringValue(state.sha256)),
          syncedAt: dateValue(distribution.syncedAt ?? state.syncedAt),
          prunedAt: dateValue(distribution.prunedAt ?? state.prunedAt),
          blockers,
          signingStatus: stringValue(
            desktop.status,
            stringValue(state.signingStatus),
          ),
          buildStatus: stringValue(
            mobile.buildStatus,
            stringValue(state.buildStatus),
          ),
          updaterStatus: updater.file
            ? 'ready'
            : stringValue(state.updaterStatus),
          updaterUrl: stringValue(updater.file, stringValue(state.updaterUrl)),
          storeProvider: stringValue(
            storeRelease.provider,
            stringValue(mobile.storeProvider),
          ),
          storeStatus: stringValue(
            storeRelease.status,
            stringValue(mobile.storeStatus),
          ),
        });
      }
    }

    return items;
  }

  private toPackageWriteData(
    item: ReturnType<ClientReleasesService['readFactPackages']>[number],
  ): Prisma.ClientPackageUncheckedCreateWithoutReleaseInput {
    return {
      client: item.client,
      target: item.target,
      shell: item.shell,
      packageName: item.packageName || null,
      artifactName: item.artifactName,
      shellVersion: item.shellVersion,
      releaseKind: item.releaseKind,
      webUrl: item.webUrl || null,
      sourceUrl: item.sourceUrl || null,
      distributionProvider: item.distributionProvider,
      distributionUrl: item.distributionUrl || null,
      distributionStatus: item.distributionStatus,
      fileName: item.fileName || null,
      fileSize: item.fileSize ?? null,
      sha256: item.sha256 || null,
      signingStatus: item.signingStatus || null,
      buildStatus: item.buildStatus || null,
      updaterStatus: item.updaterStatus || null,
      updaterUrl: item.updaterUrl || null,
      storeProvider: item.storeProvider || null,
      storeStatus: item.storeStatus || null,
      blockers: item.blockers,
      rawFacts: item.rawFacts as unknown as Prisma.InputJsonValue,
      syncedAt: item.syncedAt ?? null,
      prunedAt: item.prunedAt ?? null,
    };
  }

  private toReleaseSummary(release: ReleaseWithPackages): ClientReleaseSummary {
    const packages = release.packages;
    return {
      id: release.id,
      releaseVersion: release.releaseVersion,
      channel: release.channel,
      sourceRepository: release.sourceRepository,
      sourceRunId: release.sourceRunId,
      sourceSha: release.sourceSha,
      sourceRef: release.sourceRef,
      dryRun: release.dryRun,
      status: release.status,
      generatedAt: release.generatedAt?.toISOString() ?? null,
      syncedAt: release.syncedAt?.toISOString() ?? null,
      packageCount: packages.length,
      downloadablePackageCount: packages.filter(
        (item) => this.isPackageDownloadable(item),
      ).length,
      clients: unique(packages.map((item) => item.client)),
      targets: unique(packages.map((item) => item.target)),
      distributionStatuses: unique(
        packages.map((item) => item.distributionStatus),
      ),
      createdAt: release.createdAt.toISOString(),
      updatedAt: release.updatedAt.toISOString(),
    };
  }

  private toPackageSummary(
    item: Prisma.ClientPackageGetPayload<object>,
  ): ClientPackageSummary {
    return {
      id: item.id,
      client: item.client,
      target: item.target,
      shell: item.shell,
      packageName: item.packageName,
      artifactName: item.artifactName,
      shellVersion: item.shellVersion,
      releaseKind: item.releaseKind,
      webUrl: item.webUrl,
      sourceUrl: item.sourceUrl,
      distributionProvider: item.distributionProvider,
      distributionUrl: item.distributionUrl,
      distributionStatus: item.distributionStatus,
      fileName: item.fileName,
      fileSize: item.fileSize,
      sha256: item.sha256,
      signingStatus: item.signingStatus,
      buildStatus: item.buildStatus,
      updaterStatus: item.updaterStatus,
      updaterUrl: item.updaterUrl,
      storeProvider: item.storeProvider,
      storeStatus: item.storeStatus,
      blockers: stringArray(item.blockers),
      syncedAt: item.syncedAt?.toISOString() ?? null,
      prunedAt: item.prunedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toPackageListItem(item: PackageWithRelease): ClientPackageListItem {
    return {
      ...this.toPackageSummary(item),
      releaseId: item.releaseId,
      releaseVersion: item.release.releaseVersion,
      channel: item.release.channel,
      releaseStatus: item.release.status,
      releaseGeneratedAt: item.release.generatedAt?.toISOString() ?? null,
      releaseSyncedAt: item.release.syncedAt?.toISOString() ?? null,
      releaseSourceSha: item.release.sourceSha,
      releaseSourceRunId: item.release.sourceRunId,
    };
  }

  private toPolicySummary(
    policy: Prisma.ClientUpdatePolicyGetPayload<object>,
    releaseOptions: ClientUpdatePolicySummary['releaseOptions'] = [],
  ): ClientUpdatePolicySummary {
    const recommendedOption = releaseOptions.find(
      (option) => option.id === policy.recommendedReleaseId,
    );
    return {
      id: policy.id,
      client: policy.client,
      target: policy.target,
      channel: policy.channel,
      enabled: policy.enabled,
      recommendedReleaseId: policy.recommendedReleaseId,
      recommendedVersion: recommendedOption?.releaseVersion ?? null,
      releaseOptions,
      minimumSupportedVersion: policy.minimumSupportedVersion,
      forceUpdate: policy.forceUpdate,
      allowGithubFallback: policy.allowGithubFallback,
      notes: policy.notes,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private resolveReleaseStatus(
    packages: ReturnType<ClientReleasesService['readFactPackages']>,
    dryRun: boolean,
  ) {
    if (dryRun) {
      return 'dry-run';
    }
    if (
      packages.some(
        (item) =>
          item.distributionStatus === 'failed' || item.blockers.length > 0,
      )
    ) {
      return 'partial';
    }
    if (packages.every((item) => item.distributionStatus === 'synced')) {
      return 'synced';
    }
    return 'pending';
  }

  private resolveGeneratedAt(
    packages: ReturnType<ClientReleasesService['readFactPackages']>,
  ) {
    return packages.find((item) => item.generatedAt)?.generatedAt ?? null;
  }

  private resolveDistributionKeep(dto: ClientReleaseFactsDto) {
    const distribution = this.asRecord(
      this.asRecord(dto.artifacts).distribution,
    );
    if (stringValue(distribution.provider) !== 'self-hosted-static') {
      return null;
    }
    const keep = numberValue(distribution.keep);
    return keep && keep > 0 ? keep : null;
  }

  private async markPrunedDistributedPackages(
    tx: Prisma.TransactionClient,
    packages: ReturnType<ClientReleasesService['readFactPackages']>,
    channel: string,
    keep: number | null,
  ) {
    if (!keep) {
      return;
    }

    const pairs = unique(
      packages.map((item) => `${item.client}\u0000${item.target}`),
    );
    for (const pair of pairs) {
      const [client, target] = pair.split('\u0000');
      const releases = await tx.clientRelease.findMany({
        where: {
          channel,
          dryRun: false,
          packages: {
            some: {
              client,
              target,
              distributionProvider: 'self-hosted-static',
              distributionStatus: 'synced',
            },
          },
        },
        include: {
          packages: {
            where: {
              client,
              target,
              distributionProvider: 'self-hosted-static',
              distributionStatus: 'synced',
            },
          },
        },
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
      });
      const prunedPackageIds = releases
        .slice(keep)
        .flatMap((release) => release.packages.map((item) => item.id));
      if (prunedPackageIds.length === 0) {
        continue;
      }
      await tx.clientPackage.updateMany({
        where: { id: { in: prunedPackageIds } },
        data: {
          distributionStatus: 'pruned',
          prunedAt: new Date(),
        },
      });
    }
  }

  private asRecord(value: unknown): JsonRecord {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as JsonRecord)
      : {};
  }

  private isBelowMinimum(current?: string, minimum?: string | null) {
    if (!current || !minimum) {
      return false;
    }
    const currentParts = parseSemver(current);
    const minimumParts = parseSemver(minimum);
    if (!currentParts || !minimumParts) {
      return false;
    }
    for (let index = 0; index < 3; index += 1) {
      if (currentParts[index] < minimumParts[index]) {
        return true;
      }
      if (currentParts[index] > minimumParts[index]) {
        return false;
      }
    }
    return false;
  }

  private resolveDownloadProvider(
    selected: PackageWithRelease,
    directUrl: string | null,
  ): ClientDownloadInfo['provider'] {
    if (!directUrl) {
      return null;
    }
    if (selected.distributionUrl && directUrl === selected.distributionUrl) {
      return selected.distributionProvider;
    }
    if (selected.sourceUrl && directUrl === selected.sourceUrl) {
      return 'github-release';
    }
    return null;
  }

  private resolveDownloadReason(
    selected: PackageWithRelease,
    directUrl: string | null,
    allowGithubFallback: boolean,
  ) {
    if (directUrl) {
      return null;
    }
    if (!allowGithubFallback && selected.sourceUrl) {
      return 'github-fallback-disabled';
    }
    return 'missing-distribution-url';
  }

  private resolvePackageDownloadUrl(
    selected: PackageWithRelease,
    allowGithubFallback: boolean,
  ) {
    if (selected.distributionStatus === 'synced' && selected.distributionUrl) {
      return selected.distributionUrl;
    }
    return allowGithubFallback ? selected.sourceUrl : null;
  }

  private isPackageDownloadable(
    selected: Pick<
      PackageWithRelease,
      'distributionStatus' | 'distributionUrl' | 'sourceUrl'
    >,
  ) {
    return Boolean(
      (selected.distributionStatus === 'synced' && selected.distributionUrl) ||
        selected.sourceUrl,
    );
  }
}

function normalizeNullableString(value: unknown) {
  const normalized = stringValue(value);
  return normalized || null;
}

function stringValue(value: unknown, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean' &&
    typeof value !== 'bigint'
  ) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function dateValue(value: unknown): Date | undefined {
  const normalized = stringValue(value);
  if (!normalized) {
    return undefined;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringValue(item)).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function policyKey(policy: {
  client: string;
  target: string;
  channel: string;
}) {
  return `${policy.client}\u0000${policy.target}\u0000${policy.channel}`;
}

function parseSemver(value: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
