import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ClientPackageListItem,
  ClientPackageSummary,
  ClientReleaseSummary,
  ClientUpdatePolicySummary,
} from '@rtnn/shared-types';
import type {
  PackageWithRelease,
  ReleaseWithPackages,
} from './client-releases.types';
import { stringArray, unique } from './client-releases.utils';

@Injectable()
export class ClientReleaseMapper {
  toReleaseSummary(release: ReleaseWithPackages): ClientReleaseSummary {
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
      downloadablePackageCount: packages.filter((item) =>
        this.isPackageDownloadable(item),
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

  toPackageSummary(
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

  toPackageListItem(item: PackageWithRelease): ClientPackageListItem {
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

  toPolicySummary(
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

  isPackageDownloadable(
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
