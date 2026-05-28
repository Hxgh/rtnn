import { Prisma } from '@prisma/client';

export type JsonRecord = Record<string, unknown>;

export type PackageWithRelease = Prisma.ClientPackageGetPayload<{
  include: { release: true };
}>;

export type ReleaseWithPackages = Prisma.ClientReleaseGetPayload<{
  include: { packages: true };
}>;

export interface ClientReleaseFactPackage {
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
}

export interface ParsedClientReleaseFacts {
  packages: ClientReleaseFactPackage[];
  sourceRepository: string;
  sourceRunId: string;
  sourceSha: string;
  sourceRefs: string[];
  releaseVersion: string;
  channel: string;
  dryRun: boolean;
  generatedAt: Date | null;
  status: string;
  distributionKeep: number | null;
}
