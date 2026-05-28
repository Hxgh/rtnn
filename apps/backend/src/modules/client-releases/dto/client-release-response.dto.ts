import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createPaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

export class ClientPackageSummaryDto {
  @ApiProperty({ example: 'pkg_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'appMobile' })
  client: string;

  @ApiProperty({ example: 'android' })
  target: string;

  @ApiProperty({ example: 'mobile' })
  shell: string;

  @ApiPropertyOptional({
    type: String,
    example: 'com.example.app',
    nullable: true,
  })
  packageName?: string | null;

  @ApiProperty({ example: 'app-release.apk' })
  artifactName: string;

  @ApiProperty({ example: '1.2.3' })
  shellVersion: string;

  @ApiProperty({ example: 'release' })
  releaseKind: string;

  @ApiPropertyOptional({
    type: String,
    example: 'https://app.example.com',
    nullable: true,
  })
  webUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://github.com/org/repo',
    nullable: true,
  })
  sourceUrl?: string | null;

  @ApiProperty({
    enum: [
      'github-release',
      'self-hosted-static',
      'external-url',
      'object-storage',
    ],
    example: 'github-release',
  })
  distributionProvider: string;

  @ApiPropertyOptional({
    type: String,
    example: 'https://download.example.com/app.apk',
    nullable: true,
  })
  distributionUrl?: string | null;

  @ApiProperty({
    enum: ['pending', 'synced', 'failed', 'pruned', 'disabled'],
    example: 'synced',
  })
  distributionStatus: string;

  @ApiPropertyOptional({ type: String, example: 'app.apk', nullable: true })
  fileName?: string | null;

  @ApiPropertyOptional({ type: Number, example: 12345678, nullable: true })
  fileSize?: number | null;

  @ApiPropertyOptional({ type: String, example: 'abc123', nullable: true })
  sha256?: string | null;

  @ApiPropertyOptional({ type: String, example: 'signed', nullable: true })
  signingStatus?: string | null;

  @ApiPropertyOptional({ type: String, example: 'success', nullable: true })
  buildStatus?: string | null;

  @ApiPropertyOptional({ type: String, example: 'available', nullable: true })
  updaterStatus?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://updates.example.com/latest.json',
    nullable: true,
  })
  updaterUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: 'google-play', nullable: true })
  storeProvider?: string | null;

  @ApiPropertyOptional({ type: String, example: 'submitted', nullable: true })
  storeStatus?: string | null;

  @ApiProperty({ type: [String], example: [] })
  blockers: string[];

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  syncedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: null, nullable: true })
  prunedAt?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class ClientPackageListItemDto extends ClientPackageSummaryDto {
  @ApiProperty({ example: 'rel_01JABCD123' })
  releaseId: string;

  @ApiProperty({ example: '1.2.3' })
  releaseVersion: string;

  @ApiProperty({ example: 'production' })
  channel: string;

  @ApiProperty({ example: 'completed' })
  releaseStatus: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  releaseGeneratedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  releaseSyncedAt?: string | null;

  @ApiProperty({ example: 'bce88fb0a427' })
  releaseSourceSha: string;

  @ApiPropertyOptional({ type: String, example: '123456789', nullable: true })
  releaseSourceRunId?: string | null;
}

export class ClientReleaseSummaryDto {
  @ApiProperty({ example: 'rel_01JABCD123' })
  id: string;

  @ApiProperty({ example: '1.2.3' })
  releaseVersion: string;

  @ApiProperty({ example: 'production' })
  channel: string;

  @ApiProperty({ example: 'example/rtnn' })
  sourceRepository: string;

  @ApiPropertyOptional({ type: String, example: '123456789', nullable: true })
  sourceRunId?: string | null;

  @ApiProperty({ example: 'bce88fb0a427' })
  sourceSha: string;

  @ApiPropertyOptional({
    type: String,
    example: 'refs/heads/main',
    nullable: true,
  })
  sourceRef?: string | null;

  @ApiProperty({ example: false })
  dryRun: boolean;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  generatedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  syncedAt?: string | null;

  @ApiProperty({ example: 2 })
  packageCount: number;

  @ApiProperty({ example: 2 })
  downloadablePackageCount: number;

  @ApiProperty({ type: [String], example: ['appMobile'] })
  clients: string[];

  @ApiProperty({ type: [String], example: ['android'] })
  targets: string[];

  @ApiProperty({ type: [String], example: ['synced'] })
  distributionStatuses: string[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class ClientUpdatePolicyReleaseOptionDto {
  @ApiProperty({ example: 'rel_01JABCD123' })
  id: string;

  @ApiProperty({ example: '1.2.3' })
  releaseVersion: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  generatedAt?: string | null;
}

export class ClientUpdatePolicySummaryDto {
  @ApiProperty({ example: 'pol_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'appMobile' })
  client: string;

  @ApiProperty({ example: 'android' })
  target: string;

  @ApiProperty({ example: 'production' })
  channel: string;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiPropertyOptional({
    type: String,
    example: 'rel_01JABCD123',
    nullable: true,
  })
  recommendedReleaseId?: string | null;

  @ApiPropertyOptional({ type: String, example: '1.2.3', nullable: true })
  recommendedVersion?: string | null;

  @ApiProperty({ type: [ClientUpdatePolicyReleaseOptionDto] })
  releaseOptions: ClientUpdatePolicyReleaseOptionDto[];

  @ApiPropertyOptional({ type: String, example: '1.0.0', nullable: true })
  minimumSupportedVersion?: string | null;

  @ApiProperty({ example: false })
  forceUpdate: boolean;

  @ApiProperty({ example: true })
  allowGithubFallback: boolean;

  @ApiPropertyOptional({
    type: String,
    example: 'Roll out after store approval',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class ClientReleaseDetailDto extends ClientReleaseSummaryDto {
  @ApiProperty({ type: [ClientPackageSummaryDto] })
  packages: ClientPackageSummaryDto[];

  @ApiProperty({ type: [ClientUpdatePolicySummaryDto] })
  policies: ClientUpdatePolicySummaryDto[];
}

export class ClientDownloadInfoDto {
  @ApiProperty({ example: 'appMobile' })
  client: string;

  @ApiProperty({ example: 'android' })
  target: string;

  @ApiProperty({ example: 'production' })
  channel: string;

  @ApiPropertyOptional({ type: String, example: '1.2.3', nullable: true })
  version?: string | null;

  @ApiPropertyOptional({ type: String, example: '1.2.3', nullable: true })
  shellVersion?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  generatedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-01-01T00:00:00.000Z',
    nullable: true,
  })
  syncedAt?: string | null;

  @ApiProperty({ enum: ['direct', 'store', 'unavailable'], example: 'direct' })
  downloadType: string;

  @ApiPropertyOptional({
    type: String,
    example: 'github-release',
    nullable: true,
  })
  provider?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://download.example.com/app.apk',
    nullable: true,
  })
  downloadUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://github.com/org/repo',
    nullable: true,
  })
  sourceUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: 'app.apk', nullable: true })
  fileName?: string | null;

  @ApiPropertyOptional({ type: Number, example: 12345678, nullable: true })
  fileSize?: number | null;

  @ApiPropertyOptional({ type: String, example: 'abc123', nullable: true })
  sha256?: string | null;

  @ApiProperty({ example: true })
  updateAvailable: boolean;

  @ApiProperty({ example: false })
  forceUpdate: boolean;

  @ApiPropertyOptional({ type: String, example: '1.0.0', nullable: true })
  minimumSupportedVersion?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Roll out after store approval',
    nullable: true,
  })
  notes?: string | null;

  @ApiPropertyOptional({ type: String, example: null, nullable: true })
  reason?: string | null;
}

export class ClientReleaseListResponseDto extends createPaginatedResponseDto(
  ClientReleaseSummaryDto,
) {}

export class ClientPackageListResponseDto extends createPaginatedResponseDto(
  ClientPackageListItemDto,
) {}
