import { Injectable } from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  type ClientUpdatePolicySummary,
} from '@rtnn/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditWriter } from '../audit/audit-writer.service';
import { AuditActor } from '../audit/audit.types';
import { apiBadRequest, apiNotFound } from '../../common/errors/api-error';
import { UpdateClientReleasePolicyDto } from './dto/update-client-release-policy.dto';
import { ClientReleaseDownloadResolver } from './client-release-download-resolver.service';
import { ClientReleaseMapper } from './client-release-mapper.service';
import { ClientReleaseQueryService } from './client-release-query.service';
import { normalizeNullableString, policyKey } from './client-releases.utils';

@Injectable()
export class ClientReleasePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriter,
    private readonly downloads: ClientReleaseDownloadResolver,
    private readonly queryService: ClientReleaseQueryService,
    private readonly mapper: ClientReleaseMapper,
  ) {}

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
      throw apiNotFound(
        'CLIENT_RELEASE_POLICY_NOT_FOUND',
        'Client update policy not found',
      );
    }
    const belongsToRelease =
      existing.channel === release.channel &&
      release.packages.some(
        (item) =>
          item.client === existing.client && item.target === existing.target,
      );
    if (!belongsToRelease) {
      throw apiNotFound(
        'CLIENT_RELEASE_POLICY_NOT_FOUND',
        'Client update policy not found',
      );
    }

    const recommendedReleaseId = normalizeNullableString(
      dto.recommendedReleaseId,
    );
    const nextAllowGithubFallback =
      dto.allowGithubFallback ?? existing.allowGithubFallback;
    if (recommendedReleaseId) {
      const candidate = await this.downloads.findPackageByReleaseId(
        recommendedReleaseId,
        existing.client,
        existing.target,
      );
      if (!candidate || candidate.release.channel !== existing.channel) {
        throw apiBadRequest(
          'CLIENT_RELEASE_POLICY_INVALID_RECOMMENDATION',
          'Recommended release is not available for this client target channel',
        );
      }
      if (
        !this.downloads.resolvePackageDownloadUrl(
          candidate,
          nextAllowGithubFallback,
        )
      ) {
        throw apiBadRequest(
          'CLIENT_RELEASE_POLICY_INVALID_RECOMMENDATION',
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
          action: AUDIT_ACTIONS.adminClientReleasePolicyUpdate,
          resource: {
            type: 'client-release-policy',
            id: policyId,
            name: policyKey(updated),
          },
          detail: {
            client: updated.client,
            target: updated.target,
            channel: updated.channel,
            enabled: updated.enabled,
            forceUpdate: updated.forceUpdate,
            allowGithubFallback: updated.allowGithubFallback,
            recommendedReleaseId: updated.recommendedReleaseId,
            minimumSupportedVersion: updated.minimumSupportedVersion,
          },
        },
        tx,
      );

      return updated;
    });

    const optionsByPolicyKey = await this.queryService.resolvePolicyOptions([
      policy,
    ]);

    return this.mapper.toPolicySummary(
      policy,
      optionsByPolicyKey.get(policyKey(policy)) ?? [],
    );
  }
}
