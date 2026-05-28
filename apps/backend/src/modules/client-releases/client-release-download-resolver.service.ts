import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ClientDownloadInfo,
  ClientDownloadListQuery,
  ClientUpdateCheckInfo,
} from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ClientDownloadListQueryDto } from './dto/client-download-list-query.dto';
import { ClientDownloadQueryDto } from './dto/client-download-query.dto';
import type { PackageWithRelease } from './client-releases.types';
import { parseSemver, unique } from './client-releases.utils';

@Injectable()
export class ClientReleaseDownloadResolver {
  constructor(private readonly prisma: PrismaService) {}

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

  async findPackageByReleaseId(
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

  resolvePackageDownloadUrl(
    selected: PackageWithRelease,
    allowGithubFallback: boolean,
  ) {
    if (selected.distributionStatus === 'synced' && selected.distributionUrl) {
      return selected.distributionUrl;
    }
    return allowGithubFallback ? selected.sourceUrl : null;
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
}
