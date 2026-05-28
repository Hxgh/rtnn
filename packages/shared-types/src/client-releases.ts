import type { PaginationQuery } from "./pagination";

export type ClientReleaseDistributionStatus =
  | "pending"
  | "synced"
  | "failed"
  | "pruned"
  | "disabled"
  | (string & {});

export type ClientReleaseDistributionProvider =
  | "github-release"
  | "self-hosted-static"
  | "external-url"
  | "object-storage"
  | (string & {});

export type ClientDownloadType = "direct" | "store" | "unavailable";

export interface ClientReleaseListQuery extends PaginationQuery {
  search?: string;
  channel?: string;
  client?: string;
  target?: string;
  distributionStatus?: ClientReleaseDistributionStatus;
}

export interface ClientPackageListQuery extends PaginationQuery {
  search?: string;
  channel?: string;
  client?: string;
  target?: string;
  distributionStatus?: ClientReleaseDistributionStatus;
}

export interface ClientPackageSummary {
  id: string;
  client: string;
  target: string;
  shell: string;
  packageName?: string | null;
  artifactName: string;
  shellVersion: string;
  releaseKind: string;
  webUrl?: string | null;
  sourceUrl?: string | null;
  distributionProvider: ClientReleaseDistributionProvider;
  distributionUrl?: string | null;
  distributionStatus: ClientReleaseDistributionStatus;
  fileName?: string | null;
  fileSize?: number | null;
  sha256?: string | null;
  signingStatus?: string | null;
  buildStatus?: string | null;
  updaterStatus?: string | null;
  updaterUrl?: string | null;
  storeProvider?: string | null;
  storeStatus?: string | null;
  blockers: string[];
  syncedAt?: string | null;
  prunedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPackageListItem extends ClientPackageSummary {
  releaseId: string;
  releaseVersion: string;
  channel: string;
  releaseStatus: string;
  releaseGeneratedAt?: string | null;
  releaseSyncedAt?: string | null;
  releaseSourceSha: string;
  releaseSourceRunId?: string | null;
}

export interface ClientReleaseSummary {
  id: string;
  releaseVersion: string;
  channel: string;
  sourceRepository: string;
  sourceRunId?: string | null;
  sourceSha: string;
  sourceRef?: string | null;
  dryRun: boolean;
  status: string;
  generatedAt?: string | null;
  syncedAt?: string | null;
  packageCount: number;
  downloadablePackageCount: number;
  clients: string[];
  targets: string[];
  distributionStatuses: ClientReleaseDistributionStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientUpdatePolicySummary {
  id: string;
  client: string;
  target: string;
  channel: string;
  enabled: boolean;
  recommendedReleaseId?: string | null;
  recommendedVersion?: string | null;
  releaseOptions: Array<{
    id: string;
    releaseVersion: string;
    generatedAt?: string | null;
  }>;
  minimumSupportedVersion?: string | null;
  forceUpdate: boolean;
  allowGithubFallback: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientReleaseDetail extends ClientReleaseSummary {
  packages: ClientPackageSummary[];
  policies: ClientUpdatePolicySummary[];
}

export interface UpdateClientReleasePolicyInput {
  enabled?: boolean;
  recommendedReleaseId?: string | null;
  minimumSupportedVersion?: string | null;
  forceUpdate?: boolean;
  allowGithubFallback?: boolean;
  notes?: string | null;
}

export interface ClientDownloadQuery {
  client: string;
  target: string;
  channel?: string;
  currentVersion?: string;
}

export interface ClientDownloadListQuery {
  channel?: string;
  client?: string;
  target?: string;
}

export interface ClientDownloadInfo {
  client: string;
  target: string;
  channel: string;
  version?: string | null;
  shellVersion?: string | null;
  generatedAt?: string | null;
  syncedAt?: string | null;
  downloadType: ClientDownloadType;
  provider?: ClientReleaseDistributionProvider | null;
  downloadUrl?: string | null;
  sourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  sha256?: string | null;
  updateAvailable: boolean;
  forceUpdate: boolean;
  minimumSupportedVersion?: string | null;
  notes?: string | null;
  reason?: string | null;
}

export type ClientUpdateCheckQuery = ClientDownloadQuery;

export type ClientUpdateCheckInfo = ClientDownloadInfo;
