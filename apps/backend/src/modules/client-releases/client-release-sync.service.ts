import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ClientReleaseFactsDto } from './dto/client-release-facts.dto';
import { ClientReleaseFactsParser } from './client-release-facts-parser.service';
import type { ClientReleaseFactPackage } from './client-releases.types';
import { unique } from './client-releases.utils';

@Injectable()
export class ClientReleaseSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ClientReleaseFactsParser,
  ) {}

  async syncFacts(dto: ClientReleaseFactsDto): Promise<string> {
    const facts = this.parser.parse(dto);

    const release = await this.prisma.$transaction(async (tx) => {
      const row = await tx.clientRelease.upsert({
        where: {
          channel_sourceRepository_sourceRunId: {
            channel: facts.channel,
            sourceRepository: facts.sourceRepository,
            sourceRunId: facts.sourceRunId,
          },
        },
        create: {
          releaseVersion: facts.releaseVersion,
          channel: facts.channel,
          sourceRepository: facts.sourceRepository,
          sourceRunId: facts.sourceRunId,
          sourceSha: facts.sourceSha,
          sourceRef: facts.sourceRefs[0] ?? facts.packages[0].sourceRef ?? null,
          dryRun: facts.dryRun,
          status: facts.status,
          generatedAt: facts.generatedAt,
          syncedAt: new Date(),
          rawFacts: dto as unknown as Prisma.InputJsonValue,
        },
        update: {
          releaseVersion: facts.releaseVersion,
          sourceSha: facts.sourceSha,
          sourceRef: facts.sourceRefs[0] ?? facts.packages[0].sourceRef ?? null,
          dryRun: facts.dryRun,
          status: facts.status,
          generatedAt: facts.generatedAt,
          syncedAt: new Date(),
          rawFacts: dto as unknown as Prisma.InputJsonValue,
        },
      });

      for (const item of facts.packages) {
        await tx.clientPackage.upsert({
          where: {
            releaseId_artifactName: {
              releaseId: row.id,
              artifactName: item.artifactName,
            },
          },
          create: {
            releaseId: row.id,
            ...this.parser.toPackageWriteData(item),
          },
          update: this.parser.toPackageWriteData(item),
        });

        await tx.clientUpdatePolicy.upsert({
          where: {
            client_target_channel: {
              client: item.client,
              target: item.target,
              channel: item.channel || facts.channel,
            },
          },
          create: {
            client: item.client,
            target: item.target,
            channel: item.channel || facts.channel,
          },
          update: {},
        });
      }

      await this.markPrunedDistributedPackages(
        tx,
        facts.packages,
        facts.channel,
        facts.distributionKeep,
      );

      return row;
    });

    return release.id;
  }

  private async markPrunedDistributedPackages(
    tx: Prisma.TransactionClient,
    packages: ClientReleaseFactPackage[],
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
}
