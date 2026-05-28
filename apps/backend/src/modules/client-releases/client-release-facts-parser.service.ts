import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';
import type {
  ClientReleaseFactPackage,
  ParsedClientReleaseFacts,
} from './client-releases.types';
import {
  asRecord,
  dateValue,
  numberValue,
  stringArray,
  stringValue,
} from './client-releases.utils';

@Injectable()
export class ClientReleaseFactsParser {
  parse(dto: ClientReleaseFactsDto): ParsedClientReleaseFacts {
    if (dto.schemaVersion !== 'rtnn.deploy.client-release-facts.v1') {
      throw new BadRequestException({
        code: 'CLIENT_RELEASE_FACTS_UNSUPPORTED_SCHEMA',
        message: 'Unsupported client release facts schema',
        schemaVersion: dto.schemaVersion,
      });
    }

    const packages = this.readFactPackages(dto);
    if (packages.length === 0) {
      throw new BadRequestException({
        code: 'CLIENT_RELEASE_FACTS_EMPTY_PACKAGES',
        message: 'Client release facts do not contain packages',
      });
    }

    const source = asRecord(dto.source);
    const sourceRefs = Array.isArray(source.sourceRefs)
      ? source.sourceRefs.map((item) => stringValue(item)).filter(Boolean)
      : [];
    const dryRun = Boolean(asRecord(dto.release).dryRun);

    return {
      packages,
      sourceRepository: stringValue(source.repository, 'unknown'),
      sourceRunId: stringValue(source.runId, `unknown-${Date.now()}`),
      sourceSha: stringValue(
        source.sourceSha,
        packages[0]?.sourceSha ?? 'unknown',
      ),
      sourceRefs,
      releaseVersion: packages[0].releaseVersion,
      channel: stringValue(
        dto.environment,
        packages[0].channel || 'production',
      ),
      dryRun,
      generatedAt: this.resolveGeneratedAt(packages),
      status: this.resolveReleaseStatus(packages, dryRun),
      distributionKeep: this.resolveDistributionKeep(dto),
    };
  }

  toPackageWriteData(
    item: ClientReleaseFactPackage,
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

  private readFactPackages(dto: ClientReleaseFactsDto) {
    const items: ClientReleaseFactPackage[] = [];

    for (const [client, targetsValue] of Object.entries(dto.clients ?? {})) {
      const targets = asRecord(targetsValue);
      for (const [target, targetValue] of Object.entries(targets)) {
        const state = asRecord(targetValue);
        const distribution = asRecord(state.distribution);
        const desktop = asRecord(state.desktop);
        const mobile = asRecord(state.mobile);
        const updater = asRecord(state.updater);
        const storeRelease = asRecord(mobile.storeRelease);
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

  private resolveReleaseStatus(
    packages: ClientReleaseFactPackage[],
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

  private resolveGeneratedAt(packages: ClientReleaseFactPackage[]) {
    return packages.find((item) => item.generatedAt)?.generatedAt ?? null;
  }

  private resolveDistributionKeep(dto: ClientReleaseFactsDto) {
    const distribution = asRecord(asRecord(dto.artifacts).distribution);
    if (stringValue(distribution.provider) !== 'self-hosted-static') {
      return null;
    }
    const keep = numberValue(distribution.keep);
    return keep && keep > 0 ? keep : null;
  }
}
